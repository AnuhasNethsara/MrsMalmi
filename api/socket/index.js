// ─────────────────────────────────────────────────────────────────────────────
// Socket.io Setup — Real-time config updates
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const config = require('../../config/config');

/**
 * Sets up Socket.io for real-time communication.
 * Handles connection authentication and broadcasts config changes.
 * @param {import('socket.io').Server} io - The Socket.io server instance
 * @param {import('discord.js').Client} client - The Discord.js client instance
 */
function setupSocket(io, client) {
  // ── Authentication middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.api.jwtSecret);
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] User ${socket.user.username} connected`);

    // Join guild-specific rooms
    socket.on('join:guild', (guildId) => {
      // Verify user has access to the guild
      if (socket.user.guilds) {
        const hasAccess = socket.user.guilds.some((g) => g.id === guildId);
        if (hasAccess) {
          socket.join(`guild:${guildId}`);
          socket.emit('joined:guild', { guildId });
        } else {
          socket.emit('error', { message: 'No access to this guild' });
        }
      }
    });

    // Leave guild room
    socket.on('leave:guild', (guildId) => {
      socket.leave(`guild:${guildId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${socket.user.username} disconnected`);
    });
  });

  // ── Redis subscription for config changes ─────────────────────────────────
  if (client && client.redis) {
    // Create a duplicate connection for subscribing
    const subscriber = client.redis.duplicate();

    subscriber.subscribe('guild:settings:update', (err) => {
      if (err) {
        console.error('[Socket] Failed to subscribe to settings updates:', err.message);
        return;
      }
      console.log('[Socket] Subscribed to guild:settings:update channel');
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'guild:settings:update') {
        try {
          const data = JSON.parse(message);
          // Broadcast to all clients in the guild room
          io.to(`guild:${data.guildId}`).emit('settings:updated', {
            guildId: data.guildId,
            updates: data.updates,
            updatedBy: data.updatedBy,
          });
        } catch (error) {
          console.error('[Socket] Error broadcasting settings update:', error.message);
        }
      }
    });
  }
}

module.exports = { setupSocket };
