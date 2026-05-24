// ─────────────────────────────────────────────────────────────────────────────
// Event: messageCreate — Auto Moderation pipeline + Scam Protection
// ─────────────────────────────────────────────────────────────────────────────

const { PermissionFlagsBits } = require('discord.js');
const { processMessage } = require('../../services/security/autoMod');
const { scanMessage } = require('../../services/security/scamProtection');
const { expandUrl } = require('../../services/security/urlExpander');
const { scanUrl: virusTotalScan } = require('../../services/security/virusTotal');
const { extractUrls } = require('../../services/security/scamProtection');
const Guild = require('../../database/models/Guild');
const logger = require('../../utils/logger');

// Default timeout duration for scam detection: 10 minutes (in ms)
const SCAM_TIMEOUT_DURATION = 10 * 60 * 1000;

module.exports = {
  name: 'messageCreate',
  once: false,

  /**
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client} client
   */
  async execute(message, client) {
    try {
      // Ignore bots
      if (message.author.bot) return;

      // Ignore DMs
      if (!message.guild) return;

      // Ignore users with ManageMessages permission (moderators)
      if (message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return;
      }

      // Run message through auto-mod pipeline
      const result = await processMessage(message, client);

      // If triggered, delete the offending message
      if (result.triggered) {
        if (message.deletable) {
          await message.delete().catch((err) => {
            logger.error(`[AutoMod:messageCreate] Failed to delete message: ${err.message}`);
          });
        }

        logger.info(
          `[AutoMod:messageCreate] Deleted message from ${message.author.tag} in guild ${message.guild.id} — Filter: ${result.filter}, Action: ${result.action}`
        );
        return;
      }

      // ─── Scam Protection ────────────────────────────────────────────────
      await runScamProtection(message, client);
    } catch (err) {
      logger.error(`[AutoMod:messageCreate] Error: ${err.message}`);
    }
  },
};

/**
 * Runs the scam protection pipeline on a message.
 * Checks if scam protection is enabled, scans URLs against patterns/blacklist,
 * expands shortened URLs, and optionally checks VirusTotal.
 *
 * @param {import('discord.js').Message} message
 * @param {import('discord.js').Client} client
 */
async function runScamProtection(message, client) {
  try {
    // Fetch guild settings
    const guildSettings = await Guild.findOne({ guildId: message.guild.id }).lean();

    // Check if scam protection is enabled
    if (!guildSettings?.security?.scamProtection?.enabled) {
      return;
    }

    // First pass: scan message against local patterns and blacklist
    const scanResult = await scanMessage(message, client, guildSettings);
    if (scanResult.flagged) {
      await handleScamDetection(message, scanResult.reason, scanResult.url);
      return;
    }

    // Second pass: expand shortened URLs and re-check
    const urls = extractUrls(message.content);
    for (const url of urls) {
      const expandedUrl = await expandUrl(url);

      // If URL was expanded, re-check the expanded URL
      if (expandedUrl !== url) {
        const { checkPatterns, checkBlacklist } = require('../../services/security/scamProtection');

        const patternResult = checkPatterns(expandedUrl);
        if (patternResult.flagged) {
          await handleScamDetection(message, patternResult.reason, expandedUrl);
          return;
        }

        const blacklistResult = checkBlacklist(expandedUrl, guildSettings);
        if (blacklistResult.flagged) {
          await handleScamDetection(message, blacklistResult.reason, expandedUrl);
          return;
        }
      }

      // Third pass: VirusTotal check (for all URLs including expanded ones)
      const vtResult = await virusTotalScan(expandedUrl);
      if (vtResult.malicious) {
        await handleScamDetection(message, `VirusTotal: ${vtResult.details}`, expandedUrl);
        return;
      }
    }
  } catch (err) {
    logger.error(`[ScamProtection:messageCreate] Error: ${err.message}`);
  }
}

/**
 * Handles a detected scam URL: deletes message, timeouts user, logs incident.
 *
 * @param {import('discord.js').Message} message
 * @param {string} reason - Why the URL was flagged
 * @param {string} url - The flagged URL
 */
async function handleScamDetection(message, reason, url) {
  try {
    // Delete the message
    if (message.deletable) {
      await message.delete().catch((err) => {
        logger.error(`[ScamProtection] Failed to delete message: ${err.message}`);
      });
    }

    // Timeout the user (10 minutes)
    if (message.member && message.member.moderatable) {
      await message.member.timeout(SCAM_TIMEOUT_DURATION, `[ScamProtection] ${reason}`).catch((err) => {
        logger.error(`[ScamProtection] Failed to timeout user: ${err.message}`);
      });
    }

    // Log the incident
    logger.info(
      `[ScamProtection] Flagged message from ${message.author.tag} in guild ${message.guild.id} — Reason: ${reason}, URL: ${url}`
    );
  } catch (err) {
    logger.error(`[ScamProtection] Error handling scam detection: ${err.message}`);
  }
}
