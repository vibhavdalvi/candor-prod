const router    = require('express').Router();
const { z }     = require('zod');
const Anthropic = require('@anthropic-ai/sdk');
const { protect } = require('../middleware/auth');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.use(protect);

const modeContext = {
  founder:
    'Founder idea validation: discovery interviews, assumptions, alternatives—not a pitch.',
  csat: 'Post-interaction satisfaction: expectation vs reality, repeat intent.',
  researcher: 'Academic/pro qual research: neutral tone, one RQ, inclusion lens.',
  product: 'Product/UX feedback: real usage stories and friction—not feature voting.',
  event: 'Post-event: highs/lows, logistics, whether takeaways landed.',
  hr: 'Anonymous team pulse: workload, clarity, morale—no identifying detail.',
};

const MODE_SUGGEST_FIELDS = {
  founder: ['target', 'hypothesis'],
  researcher: ['hypothesis', 'criteria'],
  product: ['focus', 'concern'],
  event: ['format', 'goal'],
  hr: ['period', 'focus'],
  csat: ['touchpoint', 'concern'],
};

// POST /api/ai/suggest — scope: "fields" (paired inputs only) or "depth" (turns + recruit + rationale)
router.post('/suggest', async (req, res) => {
  try {
    const schema = z.object({
      mode: z.enum(['founder', 'csat', 'researcher', 'product', 'event', 'hr']),
      topic: z.string().min(10),
      target: z.string().optional(),
      context: z.record(z.string()).optional(),
      scope: z.enum(['fields', 'depth']),
    });
    const { mode, topic, target, context, scope } = schema.parse(req.body);

    const fieldKeys = MODE_SUGGEST_FIELDS[mode];
    const contextLines =
      context && typeof context === 'object'
        ? Object.entries(context)
            .filter(([, v]) => v != null && String(v).trim())
            .map(([k, v]) => `- ${k}: ${String(v).trim().slice(0, 600)}`)
            .join('\n')
        : '';

    if (scope === 'fields') {
      const fieldsJson = fieldKeys.map((k) => `"${k}": "<concise string tailored to the topic>"`).join(',\n    ');
      const prompt = `You help configure AI-led qualitative interviews.

Mode: ${mode}
Intent: ${modeContext[mode]}

Main topic (do not rewrite or return this key):
${topic}
${target ? `Hint:\n${target}\n` : ''}
${contextLines ? `Current form:\n${contextLines}\n` : ''}

Return ONLY JSON (no markdown):
{
  "fields": {
    ${fieldsJson}
  },
  "fieldReasoning": "<1-2 short sentences: why these values fit the topic>"
}

Rules:
- Every key in "fields" must appear with a non-empty, specific string.
- Do not return questions, depth, or recruit ideas—only fields + fieldReasoning.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.content[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const f = clean.indexOf('{');
      const l = clean.lastIndexOf('}');
      if (f === -1 || l === -1) throw new Error('No JSON in response');
      const data = JSON.parse(clean.slice(f, l + 1));

      const fieldsIn = data.fields && typeof data.fields === 'object' ? data.fields : {};
      const fields = {};
      for (const key of fieldKeys) {
        const v = fieldsIn[key];
        if (v != null && String(v).trim() !== '') fields[key] = String(v).trim();
      }

      return res.json({
        scope: 'fields',
        fields,
        fieldReasoning: data.fieldReasoning != null ? String(data.fieldReasoning).trim() : '',
      });
    }

    // scope === 'depth'
    const prompt = `You help configure pacing and recruitment for an AI-led qualitative interview.

Mode: ${mode}
Intent: ${modeContext[mode]}

Main topic:
${topic}
${target ? `Hint:\n${target}\n` : ''}
${contextLines ? `Study context (use to tune depth and who to recruit):\n${contextLines}\n` : ''}

Return ONLY JSON (no markdown):
{
  "questions": <integer 3-15, max back-and-forth turns before the interview may close>,
  "recruitIdeas": [
    { "profile": "<short role/situation>", "why": "<one sentence>" },
    { "profile": "<...>", "why": "<...>" },
    { "profile": "<...>", "why": "<...>" }
  ],
  "reasoning": "<2 short sentences: why this depth and recruiting angles fit this study>"
}

Rules:
- "questions" must be in [3,15].
- Do not return the paired field keys (${fieldKeys.join(', ')}) or rewrite the main topic—only questions, recruitIdeas, reasoning.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const f = clean.indexOf('{');
    const l = clean.lastIndexOf('}');
    if (f === -1 || l === -1) throw new Error('No JSON in response');
    const data = JSON.parse(clean.slice(f, l + 1));

    let questions = parseInt(data.questions, 10);
    if (Number.isNaN(questions)) questions = 5;
    questions = Math.min(15, Math.max(3, questions));

    const recruitIdeas = Array.isArray(data.recruitIdeas)
      ? data.recruitIdeas
          .filter((x) => x && (x.profile || x.why))
          .map((x) => ({
            profile: String(x.profile || '').trim(),
            why: String(x.why || '').trim(),
          }))
          .filter((x) => x.profile || x.why)
      : [];

    return res.json({
      scope: 'depth',
      questions,
      reasoning: data.reasoning != null ? String(data.reasoning).trim() : '',
      recruitIdeas,
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
