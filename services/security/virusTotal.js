// ─────────────────────────────────────────────────────────────────────────────
// VirusTotal Service — URL scanning via VirusTotal API
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');
const config = require('../../config/config');
const logger = require('../../utils/logger');

const VIRUSTOTAL_URL_SCAN = 'https://www.virustotal.com/api/v3/urls';
const TIMEOUT_MS = 5000;

/**
 * Scans a URL using the VirusTotal API.
 * Returns malicious status, detection score, and details.
 * Falls back gracefully if API key is missing or API fails.
 *
 * @param {string} url - The URL to scan
 * @returns {Promise<{ malicious: boolean, score: number, details: string }>}
 */
async function scanUrl(url) {
  // If API key is not configured, return unavailable
  if (!config.virustotal.apiKey) {
    return { malicious: false, score: 0, details: 'API unavailable' };
  }

  try {
    // Submit URL for scanning
    const encodedUrl = Buffer.from(url).toString('base64url');

    const response = await axios.get(`${VIRUSTOTAL_URL_SCAN}/${encodedUrl}`, {
      headers: {
        'x-apikey': config.virustotal.apiKey,
      },
      timeout: TIMEOUT_MS,
    });

    const stats = response.data?.data?.attributes?.last_analysis_stats;
    if (!stats) {
      return { malicious: false, score: 0, details: 'No analysis data available' };
    }

    const maliciousCount = (stats.malicious || 0) + (stats.suspicious || 0);
    const totalEngines = Object.values(stats).reduce((sum, val) => sum + val, 0);
    const score = totalEngines > 0 ? maliciousCount / totalEngines : 0;

    // Flag as malicious if more than 10% of engines detect it
    const isMalicious = score > 0.1;

    if (isMalicious) {
      logger.info(
        `[VirusTotal] URL flagged as malicious: ${url} (score: ${(score * 100).toFixed(1)}%, ${maliciousCount}/${totalEngines} engines)`
      );
    }

    return {
      malicious: isMalicious,
      score,
      details: `${maliciousCount}/${totalEngines} engines flagged this URL`,
    };
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      logger.warn(`[VirusTotal] Request timed out for URL: ${url}`);
    } else {
      logger.error(`[VirusTotal] API error for URL ${url}: ${err.message}`);
    }

    return { malicious: false, score: 0, details: 'API unavailable' };
  }
}

module.exports = { scanUrl };
