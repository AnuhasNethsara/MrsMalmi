// ─────────────────────────────────────────────────────────────────────────────
// Antigravity Discord Bot — Entry Point
// ─────────────────────────────────────────────────────────────────────────────

// Load environment variables and validated config first
const config = require('./config/config');

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const Redis = require('ioredis');

// ─────────────────────────────────────────────────────────────────────────────
// Create Discord Client with all required intents
// ─────────────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.DirectMessages,
  ],
});

// Collection to store loaded commands (name -> command module)
client.commands = new Collection();

// ─────────────────────────────────────────────────────────────────────────────
// Startup sequence
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // 1. Connect to MongoDB
    const connectDatabase = require('./database/connect');
    await connectDatabase();
    console.log('[Database] MongoDB connected successfully.');

    // 2. Connect to Redis and attach to client
    const redis = new Redis(config.redis.url);

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully.');
    });

    client.redis = redis;

    // 3. Load command and event handlers
    const commandHandler = require('./handlers/commandHandler');
    const eventHandler = require('./handlers/eventHandler');

    commandHandler(client);
    eventHandler(client);

    // 4. Login to Discord
    await client.login(config.discord.token);
    console.log(`[Bot] Logged in as ${client.user.tag}`);

    // 5. Start the API server
    const { startAPI } = require('./api/server');
    startAPI(client);
  } catch (error) {
    console.error('[Startup] Fatal error during initialization:', error);
    process.exit(1);
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// Global error handlers — log but don't crash
// ─────────────────────────────────────────────────────────────────────────────
process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

// ─────────────────────────────────────────────────────────────────────────────
// Graceful shutdown handler
// ─────────────────────────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n[Process] Received ${signal}. Shutting down gracefully...`);

  try {
    // Disconnect Redis
    if (client.redis) {
      await client.redis.quit();
      console.log('[Redis] Disconnected.');
    }

    // Disconnect MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('[Database] MongoDB disconnected.');
    }

    // Destroy the Discord client
    client.destroy();
    console.log('[Bot] Client destroyed.');
  } catch (error) {
    console.error('[Shutdown] Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
