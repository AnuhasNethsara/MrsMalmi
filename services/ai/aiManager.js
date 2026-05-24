// ─────────────────────────────────────────────────────────────────────────────
// AI Manager — Abstracts AI provider calls with rate limiting
// ─────────────────────────────────────────────────────────────────────────────

const config = require('../../config/config');
const Guild = require('../../database/models/Guild');
const logger = require('../../utils/logger');

/**
 * In-memory rate limit tracker per guild.
 * Key: guildId, Value: { count, resetAt }
 */
const rateLimits = new Map();

/** Rate limit window in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW = 60 * 1000;

/**
 * Checks if AI is available and enabled for a guild.
 *
 * @param {string} guildId - The guild ID to check
 * @returns {Promise<boolean>} Whether AI is available
 */
async function isAvailable(guildId) {
  try {
    // Check if API key is configured
    if (!config.ai?.apiKey) return false;

    // Check if AI is enabled for this guild
    const guildDoc = await Guild.findOne({ guildId }).lean();
    return guildDoc?.ai?.enabled || false;
  } catch (err) {
    logger.error(`[AIManager] Error checking availability for guild ${guildId}: ${err.message}`);
    return false;
  }
}

/**
 * Checks and enforces per-guild rate limiting using in-memory tracking.
 * Falls back to in-memory if Redis is unavailable.
 *
 * @param {string} guildId - The guild ID
 * @param {import('discord.js').Client} client - Discord client (with redis)
 * @returns {Promise<boolean>} Whether the request is allowed
 */
async function checkRateLimit(guildId, client) {
  try {
    // Try Redis-based rate limiting first
    if (client.redis) {
      const key = `ai:ratelimit:${guildId}`;
      const current = await client.redis.incr(key);

      if (current === 1) {
        await client.redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW / 1000));
      }

      // Fetch guild rate limit setting
      const guildDoc = await Guild.findOne({ guildId }).lean();
      const limit = guildDoc?.ai?.rateLimit || 10;

      return current <= limit;
    }
  } catch (err) {
    logger.debug(`[AIManager] Redis rate limit failed, using in-memory: ${err.message}`);
  }

  // Fallback: in-memory rate limiting
  const now = Date.now();
  let entry = rateLimits.get(guildId);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    rateLimits.set(guildId, entry);
  }

  entry.count++;

  // Default limit of 10 per minute
  return entry.count <= 10;
}

/**
 * Sends a chat prompt to the AI provider and returns the response.
 * Handles rate limiting and graceful fallback on errors.
 *
 * @param {string} prompt - The user's prompt/question
 * @param {string} guildId - The guild ID for rate limiting
 * @param {import('discord.js').Client} client - Discord client
 * @returns {Promise<{ success: boolean, response: string }>}
 */
async function chat(prompt, guildId, client) {
  try {
    // Check if AI is available
    const available = await isAvailable(guildId);
    if (!available) {
      return { success: false, response: 'AI is not enabled for this server.' };
    }

    // Check rate limit
    const allowed = await checkRateLimit(guildId, client);
    if (!allowed) {
      return { success: false, response: 'Rate limit exceeded. Please try again in a moment.' };
    }

    // Make API call to OpenAI-compatible endpoint
    const apiKey = config.ai.apiKey;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful Discord bot assistant. Keep responses concise and under 2000 characters.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(`[AIManager] API error: ${response.status} — ${errorData.error?.message || 'Unknown error'}`);
      return { success: false, response: 'AI service is temporarily unavailable. Please try again later.' };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return { success: false, response: 'AI returned an empty response.' };
    }

    logger.info(`[AIManager] Processed chat request for guild ${guildId}`);
    return { success: true, response: reply };
  } catch (err) {
    logger.error(`[AIManager] Error processing chat for guild ${guildId}: ${err.message}`);
    return { success: false, response: 'An error occurred while processing your request.' };
  }
}

module.exports = { chat, isAvailable, checkRateLimit };
