const mongoose = require('mongoose');
const crypto   = require('crypto');

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user','assistant'], required: true },
  content: { type: String, required: true },
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true,
  },
  token: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex'),
  },
  profile: {
    anon:       { type: Boolean, default: false },
    name:       String,
    age:        String,
    location:   String,
    role:       String,
    experience: String,
    industry:   String,
    product:    String,
    frequency:  String,
    context:    String,
    occupation: String,
    education:  String,
    usage:      String,
    tenure:     String,
    level:      String,
    firstTime:  String,
  },
  messages:    { type: [messageSchema], default: [] },
  /** Researcher-only test session — excluded from results, exports, quotas, and synthesis. */
  isPreview:   { type: Boolean, default: false },
  /** Set when a completed non-preview interview incremented the owner's plan usage (for accurate delete). */
  countedTowardQuota: { type: Boolean, default: false },
  /** True if the participant used speech-to-text for at least one reply in this session. */
  usedVoiceInput: { type: Boolean, default: false },
  /** Incremented each time the participant hits the survey question cap (drives hard stop). */
  atLimitRounds: { type: Number, default: 0 },
  completed:   { type: Boolean, default: false },
  qualityScore:Number,
  completedAt: Date,
}, { timestamps: true });

// token is already indexed via unique: true above
interviewSchema.index({ surveyId: 1, completed: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
