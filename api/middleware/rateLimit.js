// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting Middleware
// ─────────────────────────────────────────────────────────────────────────────

const rateLimit = require('express-rate-limit');

/**
 * Per-IP rate limiter: 1000 requests per minute.
 */
const perIpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many requests from this IP, please try again later' },
});

/**
 * Per-user rate limiter: 100 requests per minute.
 * Uses the user ID from the JWT payload if available, falls back to IP.
 */
const perUserLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user.id : req.ip),
  message: { error: 'Too many requests, please try again later' },
});

module.exports = { perIpLimiter, perUserLimiter };
