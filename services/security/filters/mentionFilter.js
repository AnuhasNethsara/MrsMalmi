// ─────────────────────────────────────────────────────────────────────────────
// Mention Filter — Detects excessive mentions in a single message
// ─────────────────────────────────────────────────────────────────────────────

const { AUTO_MOD } = require('../../../config/constants');
const logger = require('../../../utils/logger');

/**
 * Checks if a message contains too many user and role mentions.
 * Triggers if the total mention count exceeds AUTO_MOD.mentionLimit.
 *
 * @param {import('discord.js').Message} message - The message to check
 * @returns {{ triggered: boolean, reason: string, severity: number }}
 */
function check(message) {
  try {
    // Count user mentions + role mentions
    const userMentions = message.mentions.users.size;
    const roleMentions = message.mentions.roles.size;
    const totalMentions = userMentions + roleMentions;

    const triggered = totalMentions > AUTO_MOD.mentionLimit;

    if (triggered) {
      logger.info(
        `[AutoMod:MentionFilter] Excessive mentions detected from ${message.author.tag} in guild ${message.guild.id}: ${totalMentions} mentions`
      );
    }

    return {
      triggered,
      reason: triggered ? `Too many mentions (${totalMentions} mentions, limit is ${AUTO_MOD.mentionLimit})` : '',
      severity: triggered ? 3 : 0,
    };
  } catch (err) {
    logger.error(`[AutoMod:MentionFilter] Error checking mentions for ${message.author.id}: ${err.message}`);
    return { triggered: false, reason: '', severity: 0 };
  }
}

module.exports = { check };
