require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes      = require('./routes/auth');
const surveyRoutes    = require('./routes/surveys');
const interviewRoutes = require('./routes/interviews');
const aiRoutes        = require('./routes/ai');

const app = express();

// When behind nginx/Render/Heroku/etc., set TRUST_PROXY=true so rate limits use the real client IP.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ── Security middleware ──
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ──
/** Dev tools / proxies may send X-Forwarded-For without trust proxy — avoid noisy ValidationError. */
const rateLimitValidate = { xForwardedForHeader: false };

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  validate: rateLimitValidate,
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many AI requests, please slow down.' },
  validate: rateLimitValidate,
});
app.use('/api/', limiter);
app.use('/api/ai/', aiLimiter);

// ── Routes ──
app.use('/api/auth',       authRoutes);
app.use('/api/surveys',    surveyRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/ai',         aiRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ── Connect to MongoDB and start ──
// Explicit db name so Atlas / Compass Data Explorer shows collections under one database (e.g. candor).
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || 'candor';
mongoose.connect(mongoUri, { dbName: mongoDbName })
  .then(() => {
    console.log(`✓ MongoDB connected (database: ${mongoDbName})`);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✓ Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
