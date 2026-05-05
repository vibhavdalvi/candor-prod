const Anthropic = require('@anthropic-ai/sdk');
const Interview = require('../models/Interview');
const Survey    = require('../models/Survey');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runSentinel(survey, completedCount) {
  try {
    // Get last 5 completed interviews
    const interviews = await Interview.find({
      surveyId: survey._id,
      completed: true,
      isPreview: { $ne: true },
    })
      .sort({ completedAt: -1 })
      .limit(5)
      .lean();

    if (interviews.length < 3) return; // Not enough data

    const summaries = interviews.map((iv, i) => {
      const msgs = iv.messages.filter(m => m.role === 'user').map(m => m.content).join(' | ');
      return `Interview ${i+1}: ${msgs.slice(0, 400)}`;
    }).join('\n\n');

    const prompt = `You are monitoring a qualitative research study in progress. Analyse these ${interviews.length} recent interview summaries and detect actionable patterns.

SURVEY TOPIC: ${survey.title}
CUSTOM TOPICS (intents to elicit, not literal questions): ${survey.config?.custom || 'none'}

RECENT INTERVIEWS:
${summaries}

Return ONLY JSON:
{
  "alert": <true only if something genuinely actionable was detected>,
  "message": "<specific actionable observation — what the researcher should know and do>",
  "type": "pattern|confusion|unprompted|coverage"
}

Types:
- pattern: same unexpected theme appearing in 3+ of these interviews unprompted
- confusion: participants seem confused by the same question or topic  
- unprompted: participants keep raising a topic the study does not cover
- coverage: transcripts lack substantive signal toward the researcher's custom topics (after allowing indirect elicitation — not verbatim questions)

Only set alert: true if the observation is specific and actionable. Return alert: false for generic observations.`;

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw   = response.content[0]?.text || '';
    const clean = raw.replace(/```json|```/g,'').trim();
    const f = clean.indexOf('{'), l = clean.lastIndexOf('}');
    if (f === -1 || l === -1) return;

    const result = JSON.parse(clean.slice(f, l+1));
    if (!result.alert) return;

    // Save alert to survey
    await Survey.findByIdAndUpdate(survey._id, {
      $push: {
        sentinelAlerts: {
          message:         result.message,
          type:            result.type,
          detected_at:     new Date(),
          interview_count: completedCount,
        },
      },
    });

    // Send email if configured
    if (process.env.SMTP_HOST) {
      await sendSentinelEmail(survey, result).catch(console.error);
    }
  } catch (err) {
    console.error('Sentinel error:', err.message);
  }
}

async function sendSentinelEmail(survey, alert) {
  const nodemailer = require('nodemailer');
  const User = require('../models/User');
  const owner = await User.findById(survey.userId);
  if (!owner) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      owner.email,
    subject: `Candor detected a pattern in "${survey.title}"`,
    html: `
      <p>Hi ${owner.fullName || 'there'},</p>
      <p>Candor's sentinel system detected something worth reviewing in your study <strong>${survey.title}</strong>:</p>
      <blockquote style="border-left:3px solid #5c7a6b;padding:8px 16px;background:#e8f0ec;border-radius:4px;">
        ${alert.message}
      </blockquote>
      <p>Type: <strong>${alert.type}</strong></p>
      <p><a href="${process.env.CLIENT_URL}/surveys/${survey._id}/results">View results →</a></p>
    `,
  });
}

module.exports = { runSentinel };
