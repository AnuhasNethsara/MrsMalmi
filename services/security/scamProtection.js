// ─────────────────────────────────────────────────────────────────────────────
// Scam Protection Service — URL extraction, pattern matching, domain blacklist
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../../utils/logger');

// Regex to extract URLs from message text
const URL_REGEX = /https?:\/\/[^\s<>]+/gi;

// Known scam domain patterns (fake Discord, fake Nitro, fake Steam)
const SCAM_PATTERNS = [
  // Fake Discord domains
  /discrod\./i,
  /disc0rd\./i,
  /dlscord\./i,
  /discorcl\./i,
  /d[il1]sc[o0]rd\./i,
  /discard\./i,
  /discordd\./i,
  /discorb\./i,
  /dicsord\./i,
  /disocrd\./i,

  // Fake Nitro / gift scams (discord-like domain + nitro/free/gift keywords)
  /(?:nitro|free|gift).*(?:discord|discrod|disc0rd|dlscord)/i,
  /(?:discord|discrod|disc0rd|dlscord).*(?:nitro|free|gift)/i,

  // Fake Steam domains
  /steamcommunlty\./i,
  /stearncommunit/i,
  /steamcomrnunity\./i,
  /stearncommunitty\./i,
  /steamcornmunity\./i,
  /stearncommunity\./i,
  /steamcommunity[^.]*\./i, // steamcommunity with extra chars before TLD
];

/**
 * Extracts all URLs from a text string.
 * @param {string} text - The text to extract URLs from
 * @returns {string[]} Array of URLs found
 */
function extractUrls(text) {
  if (!text) return [];
  return text.match(URL_REGEX) || [];
}

/**
 * Checks a URL against known scam patterns.
 * @param {string} url - The URL to check
 * @returns {{ flagged: boolean, reason: string }}
 */
function checkPatterns(url) {
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(url)) {
      return {
        flagged: true,
        reason: `URL matches known scam pattern: ${pattern.source}`,
      };
    }
  }
  return { flagged: false, reason: '' };
}

/**
 * Checks a URL's domain against the guild's blacklisted domains.
 * @param {string} url - The URL to check
 * @param {object} guildSettings - The guild settings document
 * @returns {{ flagged: boolean, reason: string }}
 */
function checkBlacklist(url, guildSettings) {
  const blacklistedDomains = guildSettings?.security?.scamProtection?.blacklistedDomains || [];
  if (blacklistedDomains.length === 0) return { flagged: false, reason: '' };

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    for (const domain of blacklistedDomains) {
      const normalizedDomain = domain.toLowerCase().trim();
      if (hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`)) {
        return {
          flagged: true,
          reason: `URL domain "${hostname}" is blacklisted`,
        };
      }
    }
  } catch {
    // If URL parsing fails, skip blacklist check
  }

  return { flagged: false, reason: '' };
}

/**
 * Scans a message for scam/phishing URLs.
 * Extracts URLs, checks each against patterns and blacklist.
 *
 * @param {import('discord.js').Message} message - The message to scan
 * @param {import('discord.js').Client} client - Discord client (unused currently, reserved for future use)
 * @param {object} guildSettings - The guild settings document
 * @returns {Promise<{ flagged: boolean, reason: string, url: string }>}
 */
async function scanMessage(message, client, guildSettings) {
  try {
    const urls = extractUrls(message.content);
    if (urls.length === 0) {
      return { flagged: false, reason: '', url: '' };
    }

    for (const url of urls) {
      // Check against known scam patterns
      const patternResult = checkPatterns(url);
      if (patternResult.flagged) {
        logger.info(
          `[ScamProtection] Pattern match for ${message.author.tag} in guild ${message.guild.id}: ${url}`
        );
        return { flagged: true, reason: patternResult.reason, url };
      }

      // Check against guild blacklist
      const blacklistResult = checkBlacklist(url, guildSettings);
      if (blacklistResult.flagged) {
        logger.info(
          `[ScamProtection] Blacklist match for ${message.author.tag} in guild ${message.guild.id}: ${url}`
        );
        return { flagged: true, reason: blacklistResult.reason, url };
      }
    }

    return { flagged: false, reason: '', url: '' };
  } catch (err) {
    logger.error(`[ScamProtection] Error scanning message from ${message.author.id}: ${err.message}`);
    return { flagged: false, reason: '', url: '' };
  }
}

module.exports = { scanMessage, extractUrls, checkPatterns, checkBlacklist };
