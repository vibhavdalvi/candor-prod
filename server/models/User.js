const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
  },
  password: {
    type: String, minlength: 8, select: false,
  },
  /** Set for accounts created or linked via Google Sign-In */
  googleId: { type: String, sparse: true, unique: true },
  fullName:         { type: String, trim: true },
  plan:             { type: String, enum: ['free','starter','growth'], default: 'free' },
  interviewsUsed:   { type: Number, default: 0 },
  interviewsLimit:  { type: Number, default: 3 },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const PLAN_LIMITS = { free: 3, starter: 20, growth: -1 };

userSchema.methods.canCreateInterview = function() {
  const limit = PLAN_LIMITS[this.plan];
  if (limit === -1) return true;
  return this.interviewsUsed < limit;
};

module.exports = mongoose.model('User', userSchema);
