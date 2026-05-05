const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const insightSchema = new mongoose.Schema({
  type:       { type: String, enum: ['positive','negative','opportunity','risk'] },
  text:       String,
  confidence: { type: String, enum: ['strong','moderate','speculative'] },
}, { _id: false });

const quoteSchema = new mongoose.Schema({
  q:                  String,
  speaker:            String,
  emotional_intensity:{ type: String, enum: ['high','medium','low'] },
}, { _id: false });

const themeSchema = new mongoose.Schema({
  label:               String,
  count:               Number,
  representative_quote:String,
}, { _id: false });

const questionCoverageSchema = new mongoose.Schema({
  question:            String,
  coverage_count:      Number,
  total:               Number,
  summary:             String,
  declarative_title:   String,
  supporting_quote:    String,
  supporting_speaker:  String,
  evidence_confidence: { type: String, enum: ['strong', 'moderate', 'speculative'] },
}, { _id: false });

const synthesisDashboardQuoteSchema = new mongoose.Schema({
  q:       String,
  speaker: String,
}, { _id: false });

const synthesisDashboardSchema = new mongoose.Schema({
  signal_rate_pct:                    Number,
  researcher_questions_total:         Number,
  researcher_questions_with_evidence: Number,
  themes_headline:                    String,
  themes_narrative:                   String,
  signal_pair_quote:                  synthesisDashboardQuoteSchema,
}, { _id: false });

const perInterviewDepthSchema = new mongoose.Schema({
  interview_id:         String,
  exchange_count:       Number,
  participant_word_count: Number,
  clarification_count:  Number,
  signal:               String,
  notable_quote:        String,
}, { _id: false });

const sentinelAlertSchema = new mongoose.Schema({
  message:        String,
  type:           { type: String, enum: ['pattern','confusion','unprompted','coverage'] },
  detected_at:    { type: Date, default: Date.now },
  interview_count:Number,
}, { _id: false });

const synthesisSchema = new mongoose.Schema({
  confidence:       Number,
  positive_count:   Number,
  pattern:          String,
  insights:         [insightSchema],
  quotes:           [quoteSchema],
  themes:           [themeSchema],
  question_coverage:[questionCoverageSchema],
  dashboard:        synthesisDashboardSchema,
  signal_distribution: {
    strong_positive: Number,
    positive:        Number,
    mixed:           Number,
    negative:        Number,
  },
  per_interview_depth: [perInterviewDepthSchema],
  build_first:      String,
  next_steps:       [String],
  custom_questions_covered: String,
  sentinel_summary: String,
}, { _id: false });

const surveySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode:     { type: String, enum: ['founder','csat','researcher','product','event','hr'], required: true },
  title:    { type: String, default: '' },
  config: {
    idea:       String,
    target:     String,
    hypothesis: String,
    custom:     String,
    business:   String,
    touchpoint: String,
    concern:    String,
    probes:     String,
    rq:         String,
    criteria:   String,
    product:    String,
    focus:      String,
    event:      String,
    format:     String,
    goal:       String,
    team:       String,
    period:     String,
  },
  numQ:             { type: Number, default: 5 },
  synthesis:        synthesisSchema,
  sentinelAlerts:   { type: [sentinelAlertSchema], default: [] },
  saturationReached:{ type: Boolean, default: false },
  saturationAt:     Number,
}, { timestamps: true });

module.exports = mongoose.model('Survey', surveySchema);
