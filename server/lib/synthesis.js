const Anthropic = require('@anthropic-ai/sdk');
const { SURVEY_MODE_LABELS } = require('../constants/surveyModes');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runSynthesis(survey, interviews) {
  const n = interviews.length;
  const transcriptSummaries = interviews.map((iv, i) => {
    const name = iv.profile?.anon ? `Participant ${i+1}` : (iv.profile?.name || `Participant ${i+1}`);
    const meta = [iv.profile?.role || iv.profile?.occupation, iv.profile?.age && `${iv.profile.age}y`, iv.profile?.industry]
      .filter(Boolean).join(', ') || 'no profile';
    const participantMessages = (iv.messages || [])
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' | ');
    return `${name} (${meta}): ${participantMessages}`;
  }).join('\n\n');

  const customQuestions = survey.config?.custom || '';
  const modeLabel = SURVEY_MODE_LABELS[survey.mode] || 'Qualitative research';

  const prompt = `You are a senior qualitative research lead writing for executives and product owners. Output must read like a polished research firm memo — clear, decisive, no internal jargon like "signal" in user-facing text fields. Return ONLY a valid JSON object — no markdown, no explanation.

SURVEY TYPE: ${modeLabel}
TOPIC: ${survey.title || modeLabel + ' study'}
${survey.config?.hypothesis ? `HYPOTHESIS: ${survey.config.hypothesis}` : ''}
${survey.config?.concern ? `MAIN CONCERN: ${survey.config.concern}` : ''}
RESEARCHER TOPICS (one row per line or bullet below; elicited in conversation): ${customQuestions || 'none — omit question_coverage or use empty array'}

TRANSCRIPTS (${n} interviews):
${transcriptSummaries}

PROFESSIONAL OUTPUT — question_coverage is the product centerpiece:
• For EACH researcher topic: declarative_title must read like an executive headline (specific, decision-useful).
• summary must be 3–5 sentences: what participants actually said or did, patterns across interviews, and what it implies for the researcher's decision — not vague, not process commentary about "the AI".
• supporting_quote must anchor the summary in real transcript language.
• If evidence is thin, say so plainly in summary but still extract what CAN be concluded; set evidence_confidence accordingly.

INTERNAL CLASSIFICATION — per-interview stance (must-follow, powers charts):
CRITICAL — STANCE COUNTS (must-follow, prevents broken KPIs):
• You MUST output exactly ${n} objects in per_interview_depth — one per interview, same interview_id order as implied by transcripts above (Participant 1 = first block, etc.).
• For EACH interview assign exactly ONE "signal" on that row: strong_positive | positive | mixed | negative.
  - strong_positive: clear, specific evidence that strongly supports the study topic or researcher intents (problem real, urgency, fit, willingness, etc. as relevant).
  - positive: net supportive or validating — problem/need acknowledged, story aligns with what the researcher is learning, even if mild.
  - mixed: genuinely ambivalent OR strong push-and-pull in the transcript (not default when unsure — use positive if lean is slightly favorable).
  - negative: clearly contradicts, dismisses, or no traction on the core topic.
• Do NOT assign "mixed" to every interview by default. Polite or brief answers that still validate the problem space are usually "positive".
• After assigning all ${n} rows, set signal_distribution so the four counts SUM EXACTLY TO ${n} and match the tally of per_interview_depth signals.
• dashboard.signal_rate_pct MUST equal Math.round(100 * (strong_positive + positive) / ${n}).

DASHBOARD RULES (industry reporting practice):
• Declarative titles state conclusions, not labels (e.g. "WTP clustered under $10 when tied to time saved" not "Pricing theme").
• Pair numbers with words: themes_headline and themes_narrative must connect to what people said.
• For each researcher topic line you MUST output one question_coverage object — even if evidence is partial; describe what was said honestly and set evidence_confidence to moderate/speculative when thin.
• signal_pair_quote: one short participant quote that illustrates the dominant pattern (supportive vs mixed vs low traction) — plain language in "q", verbatim or near-verbatim from transcripts.
• dashboard.signal_rate_pct = round(100 * (strong_positive + positive) / ${n}) using your signal_distribution counts (use 0 if none).
• dashboard.researcher_questions_total = count of distinct researcher topic lines (0 if none). researcher_questions_with_evidence = how many have any usable participant text toward that intent (partial counts).
• Sort themes array by count descending (most frequent first).
• FORBIDDEN: "not asked", "not addressed", "question was not", coverage fractions like "3 of 5".

Return this exact JSON structure:
{
  "confidence": <number 0-100>,
  "positive_count": <number>,
  "pattern": "<2-3 sentence cross-interview pattern>",
  "dashboard": {
    "signal_rate_pct": <integer 0-100, (strong_positive+positive)/${n} from your counts>,
    "researcher_questions_total": <integer>,
    "researcher_questions_with_evidence": <integer>,
    "themes_headline": "<one declarative sentence: dominant theme + how many interviews — e.g. 'Workload overwhelm dominated — raised in 8 of 12 sessions'>",
    "themes_narrative": "<2-3 sentences interpreting theme pattern across interviews>",
    "signal_pair_quote": { "q": "<verbatim or near-verbatim>", "speaker": "<name / role>" }
  },
  "insights": [
    { "type": "positive", "text": "<finding>", "confidence": "strong|moderate|speculative" },
    { "type": "negative", "text": "<finding>", "confidence": "strong|moderate|speculative" },
    { "type": "opportunity", "text": "<finding>", "confidence": "strong|moderate|speculative" },
    { "type": "risk", "text": "<finding>", "confidence": "strong|moderate|speculative" }
  ],
  "quotes": [
    { "q": "<quote>", "speaker": "<name and role>", "emotional_intensity": "high|medium|low" },
    { "q": "<quote>", "speaker": "<name and role>", "emotional_intensity": "high|medium|low" },
    { "q": "<quote>", "speaker": "<name and role>", "emotional_intensity": "high|medium|low" }
  ],
  "themes": [
    { "label": "<short label>", "count": <number>, "representative_quote": "<one quote>" }
  ],
  "question_coverage": [
    {
      "question": "<researcher's line>",
      "declarative_title": "<headline conclusion — what you learned>",
      "summary": "<3-5 sentences: substance, cross-interview pattern, decision implication>",
      "supporting_quote": "<verbatim or near-verbatim from transcripts>",
      "supporting_speaker": "<who said it>",
      "evidence_confidence": "strong|moderate|speculative"
    }
  ],
  "signal_distribution": {
    "strong_positive": <number>,
    "positive": <number>,
    "mixed": <number>,
    "negative": <number>
  },
  "per_interview_depth": [
    ${interviews.map((iv) => `{ "interview_id": "${iv._id}", "exchange_count": <number>, "participant_word_count": <number>, "clarification_count": <number>, "signal": "strong_positive|positive|mixed|negative", "notable_quote": "<one short quote>" }`).join(',\n    ')}
  ],
  "build_first": "<single most concrete recommendation>",
  "next_steps": ["<step 1>", "<step 2>", "<step 3>"],
  "custom_questions_covered": "<one short paragraph tying researcher topics to evidence>",
  "sentinel_summary": "<one sentence study health>"
}

Base everything on transcripts. Do not invent quotes.`;

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 4096,
    messages:   [{ role: 'user', content: prompt }],
  });

  const raw   = response.content[0]?.text || '';
  const clean = raw.replace(/```json|```/g,'').trim();
  const f = clean.indexOf('{'), l = clean.lastIndexOf('}');
  if (f === -1 || l === -1) throw new Error('Synthesis returned no JSON');
  const synthesis = JSON.parse(clean.slice(f, l + 1));
  return reconcileSignalFromDepth(synthesis, n);
}

/**
 * Derive signal_distribution + dashboard.signal_rate_pct from per_interview_depth
 * so the dashboard never shows a hallucinated 0% when per-interview labels exist.
 */
function reconcileSignalFromDepth(synthesis, n) {
  const depths = synthesis.per_interview_depth;
  if (!Array.isArray(depths) || depths.length === 0 || !n) return synthesis;

  const dist = { strong_positive: 0, positive: 0, mixed: 0, negative: 0 };
  for (const d of depths) {
    const s = d && d.signal;
    if (s === 'strong_positive' || s === 'positive' || s === 'mixed' || s === 'negative') dist[s] += 1;
    else dist.mixed += 1;
  }

  const sum = dist.strong_positive + dist.positive + dist.mixed + dist.negative;
  if (sum < 1) return synthesis;

  synthesis.signal_distribution = dist;
  const denom = sum === n ? n : sum;
  const pct = Math.round(((dist.strong_positive + dist.positive) / denom) * 100);

  if (synthesis.dashboard && typeof synthesis.dashboard === 'object') {
    synthesis.dashboard.signal_rate_pct = pct;
  } else {
    synthesis.dashboard = { ...(synthesis.dashboard || {}), signal_rate_pct: pct };
  }

  return synthesis;
}

module.exports = { runSynthesis };
