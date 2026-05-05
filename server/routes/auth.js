const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { z }  = require('zod');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const User   = require('../models/User');
const { protect } = require('../middleware/auth');

/** Slow brute-force / token stuffing on credential endpoints (successful logins are not counted). */
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many sign-in attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false },
});

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.toLowerCase().trim() : '';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/signup
router.post('/signup', authAttemptLimiter, async (req, res) => {
  try {
    const schema = z.object({
      email:    z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(1).max(120),
    });
    const raw = schema.parse(req.body);
    const data = {
      ...raw,
      email: normalizeEmail(raw.email),
      fullName: raw.fullName.trim(),
    };
    if (!data.email) return res.status(400).json({ error: 'Valid email required' });
    const existing = await User.findOne({ email: data.email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const user  = await User.create(data);
    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.name === 'ZodError')
      return res.status(400).json({ error: err.errors[0].message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/google — verify Google ID token, create or link user, return JWT
router.post('/google', authAttemptLimiter, async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      return res.status(503).json({ error: 'Google sign-in is not configured on the server' });

    const { credential } = req.body;
    if (!credential || typeof credential !== 'string')
      return res.status(400).json({ error: 'Missing Google credential' });

    const oAuth = new OAuth2Client(clientId);
    const ticket = await oAuth.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email?.toLowerCase().trim();
    const emailVerified = payload.email_verified;
    const fullName = (payload.name || '').trim();

    if (!email || !emailVerified)
      return res.status(400).json({ error: 'A verified Google email is required' });

    let user = await User.findOne({ googleId });
    if (user) {
      if (fullName && fullName !== user.fullName) {
        user.fullName = fullName;
        await user.save();
      }
    } else {
      const byEmail = await User.findOne({ email });
      if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== googleId)
          return res.status(409).json({ error: 'This email is already linked to another sign-in method' });
        byEmail.googleId = googleId;
        if (!byEmail.fullName && fullName) byEmail.fullName = fullName;
        await byEmail.save();
        user = byEmail;
      } else {
        user = await User.create({ email, googleId, fullName: fullName || undefined });
      }
    }

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    console.error('Google auth:', err.message);
    res.status(401).json({ error: 'Could not verify Google sign-in' });
  }
});

// POST /api/auth/login
router.post('/login', authAttemptLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        error: 'No account found with this email address.',
        code: 'EMAIL_NOT_FOUND',
      });
    }
    if (!user.password) {
      return res.status(401).json({
        error: 'This email was registered with Google. Use “Continue with Google” to sign in.',
        code: 'USE_GOOGLE',
      });
    }
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Incorrect password.',
        code: 'BAD_PASSWORD',
      });
    }
    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
