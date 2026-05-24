// ─────────────────────────────────────────────────────────────────────────────
// Caps Filter — Detects excessive use of capital letters
// ─────────────────────────────────────────────────────────────────────────────

const { AUTO_MOD } = require('../../../config/constants');
const logger = require('../../../utils/logger');

/**
 * Checks if a message has an excessive ratio of uppercase characters.
 * Only triggers if the message length exceeds AUTO_MOD.capsMinLength
 * and the uppercase ratio exceeds AUTO_MOD.capsThreshold.
 *
 * @param {import('discord.js').Message} message - The message to check
 * @returns {{ triggered: boolean, reason: string, severity: number }}
 */
function check(message) {
  try {
    const content = message.content;

    // Skip short messages
    if (content.length < AUTO_MOD.capsMinLength) {
      return { triggered: false, reason: '', severity: 0 };
    }

    // Count uppercase letters (only alphabetic characters count)
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) {
      return { triggered: false, reason: '', severity: 0 };
    }

    const upperCount = (letters.match(/[A-Z]/g) || []).length;
    const ratio = upperCount / letters.length;

    const triggered = ratio > AUTO_MOD.capsThreshold;

    if (triggered) {
      logger.info(
        `[AutoMod:CapsFilter] Excessive caps detected from ${message.author.tag} in guild ${message.guild.id}: ${Math.round(ratio * 100)}% caps`
      );
    }

    return {
      triggered,
      reason: triggered ? `Excessive caps usage (${Math.round(ratio * 100)}% uppercase)` : '',
      severity: triggered ? 1 : 0,
    };
  } catch (err) {
    logger.error(`[AutoMod:CapsFilter] Error checking caps for ${message.author.id}: ${err.message}`);
    return { triggered: false, reason: '', severity: 0 };
  }
}

module.exports = { check };
