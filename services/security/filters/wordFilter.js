// ─────────────────────────────────────────────────────────────────────────────
// Word Filter — Checks messages against guild's banned words list
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../../../utils/logger');

/**
 * Checks if a message contains any banned words from the guild's configuration.
 * Supports plain text matching and regex patterns in the banned words list.
 *
 * @param {import('discord.js').Message} message - The message to check
 * @param {object} guildSettings - The guild settings document
 * @returns {{ triggered: boolean, reason: string, severity: number, word: string }}
 */
function check(message, guildSettings) {
  try {
    const bannedWords = guildSettings?.security?.autoMod?.bannedWords || [];
    if (bannedWords.length === 0) {
      return { triggered: false, reason: '', severity: 0, word: '' };
    }

    const content = message.content.toLowerCase();

    for (const word of bannedWords) {
      try {
        // Try to treat the word as a regex pattern
        const regex = new RegExp(word, 'i');
        if (regex.test(content)) {
          logger.info(
            `[AutoMod:WordFilter] Banned word detected from ${message.author.tag} in guild ${message.guild.id}: matched "${word}"`
          );
          return {
            triggered: true,
            reason: `Message contains a banned word/pattern`,
            severity: 3,
            word,
          };
        }
      } catch (regexErr) {
        // If the word is not a valid regex, do a plain text match
        if (content.includes(word.toLowerCase())) {
          logger.info(
            `[AutoMod:WordFilter] Banned word detected from ${message.author.tag} in guild ${message.guild.id}: matched "${word}"`
          );
          return {
            triggered: true,
            reason: `Message contains a banned word`,
            severity: 3,
            word,
          };
        }
      }
    }

    return { triggered: false, reason: '', severity: 0, word: '' };
  } catch (err) {
    logger.error(`[AutoMod:WordFilter] Error checking words for ${message.author.id}: ${err.message}`);
    return { triggered: false, reason: '', severity: 0, word: '' };
  }
}

module.exports = { check };
