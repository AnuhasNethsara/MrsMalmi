// ─────────────────────────────────────────────────────────────────────────────
// Toxicity Analyzer — AI-powered toxicity scoring for messages
// ─────────────────────────────────────────────────────────────────────────────

const config = require('../../config/config');
const logger = require('../../utils/logger');

/** Toxicity threshold — messages scoring above this are considered toxic */
const TOXICITY_THRESHOLD = 0.7;

/**
 * Analyzes text for toxicity using the AI provider.
 * Returns a score between 0 and 1, where 1 is most toxic.
 *
 * @param {string} text - The text to analyze
 * @param {import('discord.js').Client} client - Discord client
 * @returns {Promise<{ score: number, toxic: boolean }>}
 */
async function analyzeToxicity(text, client) {
  try {
    // Check if AI API key is configured
    if (!config.ai?.apiKey) {
      logger.debug('[ToxicityAnalyzer] No AI API key configured, skipping analysis');
      return { score: 0, toxic: false };
    }

    // Skip very short messages
    if (!text || text.trim().length < 5) {
      return { score: 0, toxic: false };
    }

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
            content: 'You are a toxicity classifier. Analyze the following message and respond with ONLY a number between 0 and 1 representing the toxicity score. 0 means not toxic at all, 1 means extremely toxic. Consider hate speech, harassment, threats, and severe profanity as toxic. Respond with ONLY the number, nothing else.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      logger.error(`[ToxicityAnalyzer] API error: ${response.status}`);
      return { score: 0, toxic: false };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    // Parse the score
    const score = parseFloat(reply);
    if (isNaN(score) || score < 0 || score > 1) {
      logger.warn(`[ToxicityAnalyzer] Invalid score received: "${reply}"`);
      return { score: 0, toxic: false };
    }

    const toxic = score > TOXICITY_THRESHOLD;

    if (toxic) {
      logger.info(`[ToxicityAnalyzer] Toxic content detected (score: ${score.toFixed(2)})`);
    }

    return { score, toxic };
  } catch (err) {
    logger.error(`[ToxicityAnalyzer] Error analyzing toxicity: ${err.message}`);
    // Fail open — don't block messages if analysis fails
    return { score: 0, toxic: false };
  }
}

module.exports = { analyzeToxicity, TOXICITY_THRESHOLD };
