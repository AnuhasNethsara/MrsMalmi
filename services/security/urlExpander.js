// ─────────────────────────────────────────────────────────────────────────────
// URL Expander Service — Expands shortened URLs to their final destination
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');
const logger = require('../../utils/logger');

const TIMEOUT_MS = 3000;

// Common URL shortener domains
const SHORTENER_DOMAINS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'buff.ly',
  'ow.ly',
  'rebrand.ly',
  'bl.ink',
  'short.io',
  'cutt.ly',
  'rb.gy',
  'shorturl.at',
  'tiny.cc',
  'v.gd',
  'qr.ae',
  'lnkd.in',
  'db.tt',
  'adf.ly',
];

/**
 * Checks if a URL is from a known URL shortener service.
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
function isShortener(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return SHORTENER_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Expands a shortened URL by following redirects.
 * Returns the final destination URL, or the original URL if:
 * - The URL is not from a known shortener
 * - The expansion fails or times out
 *
 * @param {string} url - The URL to expand
 * @returns {Promise<string>} The expanded URL or the original
 */
async function expandUrl(url) {
  // Only attempt expansion for known shorteners
  if (!isShortener(url)) {
    return url;
  }

  try {
    const response = await axios.head(url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 10,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // The final URL after following redirects
    const expandedUrl = response.request?.res?.responseUrl || response.request?._redirectable?._currentUrl || url;

    if (expandedUrl && expandedUrl !== url) {
      logger.info(`[URLExpander] Expanded ${url} → ${expandedUrl}`);
      return expandedUrl;
    }

    return url;
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      logger.warn(`[URLExpander] Timeout expanding URL: ${url}`);
    } else {
      logger.error(`[URLExpander] Error expanding URL ${url}: ${err.message}`);
    }

    return url;
  }
}

module.exports = { expandUrl, isShortener };
