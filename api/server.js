// ─────────────────────────────────────────────────────────────────────────────
// API Server — Express + Socket.io setup
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const config = require('../config/config');

const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: config.api.corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.api.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const guildRoutes = require('./routes/guilds');
const moderationRoutes = require('./routes/moderation');
const ticketRoutes = require('./routes/tickets');
const analyticsRoutes = require('./routes/analytics');
const { perIpLimiter, perUserLimiter } = require('./middleware/rateLimit');
const { setupSocket } = require('./socket/index');

app.use('/api/auth', perIpLimiter, authRoutes);
app.use('/api/guilds', perIpLimiter, perUserLimiter, guildRoutes);
app.use('/api/guilds', perIpLimiter, perUserLimiter, moderationRoutes);
app.use('/api/guilds', perIpLimiter, perUserLimiter, ticketRoutes);
app.use('/api/guilds', perIpLimiter, perUserLimiter, analyticsRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[API] Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start function ────────────────────────────────────────────────────────────

/**
 * Starts the API server and attaches the Discord client for guild data access.
 * @param {import('discord.js').Client} client - The Discord.js client instance
 */
function startAPI(client) {
  // Attach client to app for route access
  app.set('discordClient', client);

  // Setup Socket.io handlers
  setupSocket(io, client);

  server.listen(config.api.port, () => {
    console.log(`[API] Server listening on port ${config.api.port}`);
  });
}

module.exports = { app, server, io, startAPI };
