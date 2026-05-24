// ─────────────────────────────────────────────────────────────────────────────
// Link Filter — Detects Discord invite links and general URLs
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../../../utils/logger');

// Regex patterns for link detection
const DISCORD_INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[\w-]+/i;
const GENERAL_URL_REGEX = /https?:\/\/[^\s<]+/i;

/**
 * Checks if a message contains Discord invite links or general URLs.
 * Behavior depends on guild settings:
 * - inviteLinks filter: detects discord.gg and discord.com/invite links
 * - scamLinks filter: detects general URLs (broader check)
 *
 * @param {import('discord.js').Message} message - The message to check
 * @param {object} guildSettings - The guild settings document
 * @returns {{ triggered: boolean, reason: string, severity: number }}
 */
function check(message, guildSettings) {
  try {
    const content = message.content;
    const filters = guildSettings?.security?.autoMod?.filters || {};

    // Check for Discord invite links
    if (filters.inviteLinks && DISCORD_INVITE_REGEX.test(content)) {
      logger.info(
        `[AutoMod:LinkFilter] Discord invite link detected from ${message.author.tag} in guild ${message.guild.id}`
      );
      return {
        triggered: true,
        reason: 'Message contains a Discord invite link',
        severity: 2,
      };
    }

    // Check for general URLs (scam links filter)
    if (filters.scamLinks && GENERAL_URL_REGEX.test(content)) {
      logger.info(
        `[AutoMod:LinkFilter] URL detected from ${message.author.tag} in guild ${message.guild.id}`
      );
      return {
        triggered: true,
        reason: 'Message contains a URL',
        severity: 1,
      };
    }

    return { triggered: false, reason: '', severity: 0 };
  } catch (err) {
    logger.error(`[AutoMod:LinkFilter] Error checking links for ${message.author.id}: ${err.message}`);
    return { triggered: false, reason: '', severity: 0 };
  }
}

module.exports = { check };
