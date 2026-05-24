// ─────────────────────────────────────────────────────────────────────────────
// Auth Routes — Discord OAuth2 flow
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const { authenticate } = require('../middleware/auth');

const router = Router();

const DISCORD_API = 'https://discord.com/api/v10';
const OAUTH2_SCOPES = 'identify guilds';

// ── GET /api/auth/discord — Redirect to Discord OAuth2 ───────────────────────
router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: process.env.OAUTH2_REDIRECT_URI,
    response_type: 'code',
    scope: OAUTH2_SCOPES,
  });

  res.redirect(`${DISCORD_API}/oauth2/authorize?${params.toString()}`);
});

// ── GET /api/auth/callback — Exchange code for tokens, issue JWT ──────────────
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      `${DISCORD_API}/oauth2/token`,
      new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.OAUTH2_REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenResponse.data;

    // Fetch user info
    const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Fetch user guilds
    const guildsResponse = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user = userResponse.data;
    const guilds = guildsResponse.data;

    // Issue JWT with user info and guild list
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        guilds: guilds.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          permissions: g.permissions,
        })),
      },
      config.api.jwtSecret,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const redirectUrl = `${config.api.corsOrigin}/auth/callback?token=${token}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[Auth] OAuth2 callback error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ── GET /api/auth/me — Return current user info from JWT ──────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds: req.user.guilds,
  });
});

module.exports = router;
