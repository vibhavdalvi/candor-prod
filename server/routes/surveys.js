const router   = require('express').Router();
const mongoose = require('mongoose');
const { z }    = require('zod');
const Survey   = require('../models/Survey');
const Interview= require('../models/Interview');
const { protect } = require('../middleware/auth');
const { runSynthesis } = require('../lib/synthesis');
const xlsx     = require('xlsx');
const User = require('../models/User');
const { SURVEY_MODE_LABELS, deriveSurveyTitle, MODE_LOCKED_TOPIC_KEY } = require('../constants/surveyModes');

const nonPreviewMatch = { isPreview: { $ne: true } };

router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ error: 'Invalid survey id' });
  next();
});

router.param('interviewId', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ error: 'Invalid interview id' });
  next();
});

const configSchema = z.object({
  idea: z.string().optional(),
  target: z.string().optional(),
  hypothesis: z.string().optional(),
  custom: z.string().optional(),
  business: z.string().optional(),
  touchpoint: z.string().optional(),
  concern: z.string().optional(),
  probes: z.string().optional(),
  rq: z.string().optional(),
  criteria: z.string().optional(),
  product: z.string().optional(),
  focus: z.string().optional(),
  event: z.string().optional(),
  format: z.string().optional(),
  goal: z.string().optional(),
  team: z.string().optional(),
  period: z.string().optional(),
});

// All routes protected
router.use(protect);

// GET /api/surveys — list researcher's surveys
router.get('/', async (req, res) => {
  try {
    const surveys = await Survey.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    // Attach interview counts
    const ids = surveys.map(s => s._id);
    const counts = await Interview.aggregate([
      { $match: { surveyId: { $in: ids }, ...nonPreviewMatch } },
      { $group: { _id: '$surveyId', total: { $sum: 1 }, completed: { $sum: { $cond: ['$completed', 1, 0] } } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c; });
    const result = surveys.map(s => ({
      ...s,
      _counts: countMap[s._id.toString()] || { total: 0, completed: 0 },
    }));
    res.json({ surveys: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surveys — create survey
router.post('/', async (req, res) => {
  try {
    const schema = z.object({
      mode:   z.enum(['founder','csat','researcher','product','event','hr']),
      title:  z.string().optional(),
      config: configSchema,
      numQ: z.coerce.number().min(3).max(15).default(5),
    });
    const data = schema.parse(req.body);
    const title = data.title || deriveSurveyTitle(data.config);
    const survey = await Survey.create({ ...data, title, userId: req.user._id });
    // Create first interview slot
    const interview = await Interview.create({ surveyId: survey._id });
    res.status(201).json({ survey, interviewToken: interview.token });
  } catch (err) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/surveys/:id — update title, depth, and config except the locked primary topic (register a new survey to change that).
router.patch('/:id', async (req, res) => {
  try {
    const patchSchema = z.object({
      title: z.string().optional(),
      numQ: z.coerce.number().min(3).max(15).optional(),
      config: configSchema.partial().optional(),
    });
    const body = patchSchema.parse(req.body);
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    const lockedKey = MODE_LOCKED_TOPIC_KEY[survey.mode];
    if (body.title !== undefined) survey.title = body.title.trim() || survey.title;
    if (body.numQ !== undefined) survey.numQ = body.numQ;
    if (body.config) {
      const next = survey.config ? { ...survey.config } : {};
      for (const [k, v] of Object.entries(body.config)) {
        if (v === undefined || k === lockedKey) continue;
        next[k] = v;
      }
      if (lockedKey && survey.config?.[lockedKey] !== undefined) {
        next[lockedKey] = survey.config[lockedKey];
      }
      survey.config = next;
    }
    await survey.save();
    res.json({ survey });
  } catch (err) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surveys/:id/preview-interview — researcher test session (separate token; excluded from results).
router.post('/:id/preview-interview', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const interview = await Interview.create({ surveyId: survey._id, isPreview: true });
    res.status(201).json({ token: interview.token, interviewId: interview._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/surveys/:id — delete a study and all related interviews from MongoDB.
router.delete('/:id', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    const countedInterviews = await Interview.countDocuments({
      surveyId: survey._id,
      completed: true,
      isPreview: { $ne: true },
      countedTowardQuota: { $ne: false },
    });

    await Interview.deleteMany({ surveyId: survey._id });
    await survey.deleteOne();

    if (countedInterviews > 0) {
      const owner = await User.findById(req.user._id);
      if (owner) {
        owner.interviewsUsed = Math.max(0, (owner.interviewsUsed || 0) - countedInterviews);
        await owner.save();
      }
    }

    res.json({ ok: true, deletedSurveyId: req.params.id, deletedInterviewsCount: countedInterviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/surveys/:id/interviews/:interviewId — remove one response (and reverse quota if it counted).
router.delete('/:id/interviews/:interviewId', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const interview = await Interview.findOne({ _id: req.params.interviewId, surveyId: survey._id });
    if (!interview) return res.status(404).json({ error: 'Interview not found' });

    const owner = await User.findById(req.user._id);
    const counted = interview.completed && !interview.isPreview && interview.countedTowardQuota !== false;
    if (counted && owner) {
      owner.interviewsUsed = Math.max(0, (owner.interviewsUsed || 0) - 1);
      await owner.save();
    }
    await interview.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/surveys/:id — get one survey with interviews
router.get('/:id', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const interviews = await Interview.find({ surveyId: survey._id }).sort({ createdAt: -1 }).lean();
    res.json({ survey, interviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surveys/:id/synthesise — trigger AI synthesis
router.post('/:id/synthesise', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const interviews = await Interview.find({
      surveyId: survey._id,
      completed: true,
      isPreview: { $ne: true },
    });
    if (!interviews.length) return res.status(400).json({ error: 'No completed interviews' });
    const synthesis = await runSynthesis(survey, interviews);
    survey.synthesis = synthesis;
    survey.saturationReached = true;
    survey.saturationAt = interviews.length;
    await survey.save();
    res.json({ synthesis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/surveys/:id/export/json
router.get('/:id/export/json', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const interviews = await Interview.find({ surveyId: survey._id, isPreview: { $ne: true } }).lean();
    const exportData = {
      survey: { mode: survey.mode, title: survey.title, config: survey.config, createdAt: survey.createdAt },
      synthesis: survey.synthesis,
      interviews: interviews.map(iv => ({
        profile: iv.profile, messages: iv.messages,
        completed: iv.completed, completedAt: iv.completedAt,
      })),
      exportedAt: new Date().toISOString(),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="candor-${survey.title.replace(/\s+/g,'-')}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/surveys/:id/export/excel
router.get('/:id/export/excel', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const interviews = await Interview.find({
      surveyId: survey._id,
      completed: true,
      isPreview: { $ne: true },
    }).lean();
    const wb = xlsx.utils.book_new();

    // Sheet 1: Overview
    const overviewData = [
      ['Candor Research Export'],
      ['Survey', survey.title],
      ['Mode', SURVEY_MODE_LABELS[survey.mode] || survey.mode],
      ['Exported', new Date().toLocaleDateString()],
      ['Participants', interviews.length],
      [],
      ['THEMES'],
      ['Theme', 'Count', 'Representative Quote'],
      ...(survey.synthesis?.themes || []).map(t => [t.label, t.count, t.representative_quote]),
      [],
      ['NEXT STEPS'],
      ...(survey.synthesis?.next_steps || []).map(s => [s]),
    ];
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(overviewData), 'Overview');

    // Sheet 2: Participants
    const partData = [
      ['#','Name','Role','Age','Location','Signal','Word Count','Notable Quote'],
      ...interviews.map((iv, i) => {
        const wc = iv.messages.filter(m => m.role === 'user').map(m => m.content.split(' ').length).reduce((a,b)=>a+b,0);
        const depth = survey.synthesis?.per_interview_depth?.find(d => d.interview_id === iv._id.toString());
        return [
          i+1,
          iv.profile.anon ? 'Anonymous' : (iv.profile.name || 'Unnamed'),
          iv.profile.role || '',
          iv.profile.age || '',
          iv.profile.location || '',
          depth?.signal || '',
          wc,
          depth?.notable_quote || '',
        ];
      }),
    ];
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(partData), 'Participants');

    // Sheet 3: Transcripts
    const txData = [['Interview #','Turn','Role','Message']];
    interviews.forEach((iv, i) => {
      iv.messages.forEach((m, j) => {
        txData.push([i+1, j+1, m.role === 'user' ? 'Participant' : 'Interviewer', m.content]);
      });
      txData.push([]);
    });
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(txData), 'Transcripts');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="candor-${survey.title.replace(/\s+/g,'-')}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/surveys/:id/interviews — create new interview slot
router.post('/:id/interviews', async (req, res) => {
  try {
    const survey = await Survey.findOne({ _id: req.params.id, userId: req.user._id });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    const interview = await Interview.create({ surveyId: survey._id });
    res.status(201).json({ token: interview.token, interviewId: interview._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
