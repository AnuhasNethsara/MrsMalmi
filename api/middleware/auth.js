// ─────────────────────────────────────────────────────────────────────────────
// JWT Authentication Middleware
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const config = require('../../config/config');

/**
 * Verifies the JWT token from the Authorization header.
 * Attaches decoded user payload to req.user on success.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.api.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authenticate };
