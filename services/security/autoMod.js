// ─────────────────────────────────────────────────────────────────────────────
// Auto Moderation Service — Pipeline orchestrator for message filtering
// ─────────────────────────────────────────────────────────────────────────────

const Guild = require('../../database/models/Guild');
const spamFilter = require('./filters/spamFilter');
const wordFilter = require('./filters/wordFilter');
const linkFilter = require('./filters/linkFilter');
const capsFilter = require('./filters/capsFilter');
const duplicateFilter = require('./filters/duplicateFilter');
const mentionFilter = require('./filters/mentionFilter');
const { analyzeToxicity } = require('../ai/toxicityAnalyzer');
const { applyEscalation } = require('./escalation');
const logger = require('../../utils/logger');

/**
 * Processes a message through the auto-moderation pipeline.
 * Fetches guild settings, checks whitelist, runs enabled filters in order,
 * and applies escalation if any filter triggers.
 *
 * @param {import('discord.js').Message} message - The message to process
 * @param {import('discord.js').Client} client - Discord client with redis attached
 * @returns {Promise<{ triggered: boolean, filter: string, action: string }>}
 */
async function processMessage(message, client) {
  try {
    // Fetch guild settings
    const guildSettings = await Guild.findOne({ guildId: message.guild.id }).lean();

    // Check if autoMod is enabled
    if (!guildSettings?.security?.autoMod?.enabled) {
      return { triggered: false, filter: '', action: '' };
    }

    const autoModSettings = guildSettings.security.autoMod;
    const filters = autoModSettings.filters || {};

    // Check if message is from a whitelisted channel
    const whitelistedChannels = autoModSettings.whitelist?.channels || [];
    if (whitelistedChannels.includes(message.channel.id)) {
      return { triggered: false, filter: '', action: '' };
    }

    // Check if message author has a whitelisted role
    const whitelistedRoles = autoModSettings.whitelist?.roles || [];
    if (message.member && whitelistedRoles.length > 0) {
      const memberRoles = message.member.roles.cache.map((r) => r.id);
      const hasWhitelistedRole = whitelistedRoles.some((roleId) => memberRoles.includes(roleId));
      if (hasWhitelistedRole) {
        return { triggered: false, filter: '', action: '' };
      }
    }

    // Run message through each enabled filter in order
    let result;

    // 1. Spam filter (requires Redis)
    if (filters.spam) {
      result = await spamFilter.check(message, client);
      if (result.triggered) {
        const action = await applyEscalation(client, message.member, guildSettings, result.reason, 'spam');
        logger.info(`[AutoMod] Spam filter triggered for ${message.author.tag} in guild ${message.guild.id}`);
        return { triggered: true, filter: 'spam', action };
      }
    }

    // 2. Word filter (banned words)
    if (filters.badWords) {
      result = wordFilter.check(message, guildSettings);
      if (result.triggered) {
        const action = await applyEscalation(client, message.member, guildSettings, result.reason, 'badWords');
        logger.info(`[AutoMod] Word filter triggered for ${message.author.tag} in guild ${message.guild.id}`);
        return { triggered: true, filter: 'badWords', action };
      }
    }

    // 3. Link filter (invite links and URLs)
    if (filters.inviteLinks || filters.scamLinks) {
      result = linkFilter.check(message, guildSettings);
      if (result.triggered) {
        const filterName = filters.inviteLinks ? 'inviteLinks' : 'scamLinks';
        const action = await applyEscalation(client, message.member, guildSettings, result.reason, filterName);
        logger.info(`[AutoMod] Link filter triggered for ${message.author.tag} in guild ${message.guild.id}`);
        return { triggered: true, filter: filterName, action };
      }
    }

    // 4. Caps filter (excessive caps)
    if (filters.excessiveCaps) {
      result = capsFilter.check(message);
      if (result.triggered) {
        const action = await applyEscalation(client, message.member, guildSettings, result.reason, 'excessiveCaps');
        logger.info(`[AutoMod] Caps filter triggered for ${message.author.tag} in guild ${message.guild.id}`);
        return { triggered: true, filter: 'excessiveCaps', action };
      }
    }

    // 5. Duplicate filter (repeated messages, requires Redis)
    if (filters.duplicateMessages) {
      result = await duplicateFilter.check(message, client);
      if (result.triggered) {
        const action = await applyEscalation(client, message.member, guildSettings, result.reason, 'duplicateMessages');
        logger.info(`[AutoMod] Duplicate filter triggered for ${message.author.tag} in guild ${message.guild.id}`);
        return { triggered: true, filter: 'duplicateMessages', action };
      }
    }

    // 6. Mention filter (mention spam)
    if (filters.mentionSpam) {
      result = mentionFilter.check(message);
      if (result.triggered) {
        const action = await applyEscalation(client, message.member, guildSettings, result.reason, 'mentionSpam');
        logger.info(`[AutoMod] Mention filter triggered for ${message.author.tag} in guild ${message.guild.id}`);
        return { triggered: true, filter: 'mentionSpam', action };
      }
    }

    // 7. Toxicity filter (AI-powered)
    if (filters.toxicity) {
      try {
        const toxicityResult = await analyzeToxicity(message.content, client);
        if (toxicityResult.toxic) {
          const reason = `Toxic content detected (score: ${toxicityResult.score.toFixed(2)})`;
          const action = await applyEscalation(client, message.member, guildSettings, reason, 'toxicity');
          logger.info(`[AutoMod] Toxicity filter triggered for ${message.author.tag} in guild ${message.guild.id} (score: ${toxicityResult.score.toFixed(2)})`);
          return { triggered: true, filter: 'toxicity', action };
        }
      } catch (err) {
        logger.error(`[AutoMod] Toxicity filter error: ${err.message}`);
        // Fail open — don't block messages if toxicity analysis fails
      }
    }

    // No filter triggered
    return { triggered: false, filter: '', action: '' };
  } catch (err) {
    logger.error(`[AutoMod] Error processing message from ${message.author.id} in guild ${message.guild.id}: ${err.message}`);
    return { triggered: false, filter: '', action: '' };
  }
}

module.exports = { processMessage };
