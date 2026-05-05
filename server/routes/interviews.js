const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z }     = require('zod');
const Interview = require('../models/Interview');
const Survey    = require('../models/Survey');
const User      = require('../models/User');
const { buildSystem }  = require('../lib/buildSystem');
const { runSentinel }  = require('../lib/sentinel');
const { runSynthesis } = require('../lib/synthesis');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Remove internal signals the model sometimes echoes; never show these to participants. */
function sanitizeAssistantReply(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\s*\[AT_LIMIT\]\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Protects the AI message endpoint from runaway scripts (participants share IPs on NAT — limit is generous). */
const interviewMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 48,
  message: { error: 'Too many messages. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// GET /api/interviews/:token — load interview by token (public)
router.get('/:token', async (req, res) => {
  try {
    const interview = await Interview.findOne({ token: req.params.token })
      .populate('surveyId')
      .lean();
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.completed) return res.status(410).json({ error: 'already_completed' });
    // Return safe data — survey config and existing messages
    res.json({
      interviewId: interview._id,
      token: interview.token,
      isPreview: !!interview.isPreview,
      survey: {
        mode:   interview.surveyId.mode,
        title:  interview.surveyId.title,
        config: interview.surveyId.config,
        numQ:   interview.surveyId.numQ,
      },
      profile:  interview.profile,
      messages: interview.messages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/interviews/:token/profile — save participant profile (public)
router.post('/:token/profile', async (req, res) => {
  try {
    const schema = z.object({
      anon:       z.boolean().optional(),
      name:       z.string().optional(),
      age:        z.string().optional(),
      location:   z.string().optional(),
      role:       z.string().optional(),
      experience: z.string().optional(),
      industry:   z.string().optional(),
      product:    z.string().optional(),
      frequency:  z.string().optional(),
      context:    z.string().optional(),
      occupation: z.string().optional(),
      education:  z.string().optional(),
      usage:      z.string().optional(),
      tenure:     z.string().optional(),
      level:      z.string().optional(),
      firstTime:  z.string().optional(),
    });
    const profile = schema.parse(req.body);
    const interview = await Interview.findOne({ token: req.params.token });
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.completed) return res.status(410).json({ error: 'already_completed' });
    interview.profile = profile;
    await interview.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/interviews/:token/message — send a message (public, AI responds)
router.post('/:token/message', interviewMessageLimiter, async (req, res) => {
  try {
    const schema = z.object({
      messages: z.array(z.object({
        role:    z.enum(['user','assistant']),
        content: z.string(),
      })),
      signal: z.enum(['start','message','at_limit']),
      /** Client sets true when this user turn was dictated with the mic (speech recognition). */
      voiceUsedThisTurn: z.boolean().optional(),
    });
    const { messages, signal, voiceUsedThisTurn } = schema.parse(req.body);

    const interview = await Interview.findOne({ token: req.params.token })
      .populate('surveyId');
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.completed) return res.status(410).json({ error: 'already_completed' });

    const survey  = interview.surveyId;
    const profile = interview.profile;

    if (voiceUsedThisTurn && (signal === 'message' || signal === 'at_limit')) {
      interview.usedVoiceInput = true;
    }

    if (signal === 'at_limit') {
      interview.atLimitRounds = (interview.atLimitRounds || 0) + 1;
    }

    // Check plan limits (researcher preview sessions bypass quota)
    const owner = await User.findById(survey.userId);
    if (!interview.isPreview && owner && !owner.canCreateInterview() && signal !== 'start') {
      return res.status(402).json({ error: 'limit_reached' });
    }

    const numQ = survey.numQ || 5;
    const system = buildSystem(survey, profile, {
      numQ,
      atLimitRound: signal === 'at_limit' ? interview.atLimitRounds : 0,
    });

    // Build final messages for Anthropic
    let finalMessages;
    if (signal === 'start') {
      finalMessages = [{ role: 'user', content: 'START' }];
    } else {
      finalMessages = messages.map((m, i) => {
        if (i === messages.length - 1 && m.role === 'user' && signal === 'at_limit') {
          return { role: 'user', content: m.content + '\n\n[AT_LIMIT]' };
        }
        return { role: m.role, content: m.content };
      });
    }

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 400,
      system,
      messages:   finalMessages,
    });

    const raw       = response.content[0]?.text || '';
    let isDone      = raw.trimStart().startsWith('[DONE]');
    const isClarify = raw.trimStart().startsWith('[CLARIFY]');
    let reply       = sanitizeAssistantReply(
      raw.replace(/^\[DONE\]\s*/i, '').replace(/^\[CLARIFY\]\s*/i, '').trim(),
    );

    // Build updated messages array
    const updatedMessages = [
      ...interview.messages,
      ...(signal !== 'start' && messages.length ? [{ role: 'user', content: messages[messages.length-1].content }] : []),
      { role: 'assistant', content: reply },
    ];

    if (isDone) {
      interview.messages   = updatedMessages;
      interview.completed  = true;
      interview.completedAt= new Date();
      if (interview.isPreview) {
        interview.countedTowardQuota = false;
      } else if (owner) {
        owner.interviewsUsed += 1;
        await owner.save();
        interview.countedTowardQuota = true;
      } else {
        interview.countedTowardQuota = false;
      }

      await interview.save();

      // Trigger sentinel (non-blocking) — real completions only
      const completedCount = await Interview.countDocuments({
        surveyId: survey._id,
        completed: true,
        isPreview: { $ne: true },
      });
      if (completedCount > 0 && completedCount % 5 === 0) {
        runSentinel(survey, completedCount).catch(console.error);
      }

      // Auto-synthesise at 6 completions (real participants only)
      if (completedCount >= 6 && !survey.saturationReached) {
        Interview.find({
          surveyId: survey._id,
          completed: true,
          isPreview: { $ne: true },
        })
          .then(ivs => runSynthesis(survey, ivs))
          .then(async synthesis => {
            survey.synthesis = synthesis;
            survey.saturationReached = true;
            survey.saturationAt = completedCount;
            await survey.save();
          })
          .catch(console.error);
      }
    } else {
      interview.messages = updatedMessages;
      await interview.save();
    }

    res.json({ reply, isDone, isClarify });
  } catch (err) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
