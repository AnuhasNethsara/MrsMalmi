// ─────────────────────────────────────────────────────────────────────────────
// FAQ Matcher — Simple keyword/similarity matching for guild FAQ entries
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../../utils/logger');

/** Minimum similarity score to consider a match */
const MIN_MATCH_SCORE = 0.3;

/**
 * Matches a user question against guild FAQ entries using keyword similarity.
 * Returns the best matching FAQ entry or null if no good match is found.
 *
 * @param {string} question - The user's question
 * @param {Array<{ question: string, answer: string }>} faqs - Array of FAQ entries
 * @returns {{ question: string, answer: string, score: number } | null}
 */
function matchFAQ(question, faqs) {
  try {
    if (!question || !faqs || faqs.length === 0) return null;

    const queryWords = tokenize(question);
    if (queryWords.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const faq of faqs) {
      if (!faq.question || !faq.answer) continue;

      const faqWords = tokenize(faq.question);
      if (faqWords.length === 0) continue;

      // Calculate similarity score
      const score = calculateSimilarity(queryWords, faqWords);

      if (score > bestScore && score >= MIN_MATCH_SCORE) {
        bestScore = score;
        bestMatch = { question: faq.question, answer: faq.answer, score };
      }
    }

    if (bestMatch) {
      logger.debug(`[FAQMatcher] Matched question with score ${bestScore.toFixed(2)}: "${question}"`);
    }

    return bestMatch;
  } catch (err) {
    logger.error(`[FAQMatcher] Error matching FAQ: ${err.message}`);
    return null;
  }
}

/**
 * Tokenizes a string into lowercase words, removing common stop words and punctuation.
 * @param {string} text - Text to tokenize
 * @returns {string[]} Array of tokens
 */
function tokenize(text) {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
    'not', 'no', 'so', 'if', 'then', 'than', 'that', 'this', 'it', 'its',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
    'what', 'which', 'who', 'when', 'where', 'why', 'how',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));
}

/**
 * Calculates similarity between two sets of tokens using Jaccard-like coefficient
 * with partial word matching.
 *
 * @param {string[]} queryTokens - Tokens from the user's question
 * @param {string[]} faqTokens - Tokens from the FAQ question
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(queryTokens, faqTokens) {
  if (queryTokens.length === 0 || faqTokens.length === 0) return 0;

  let matchCount = 0;

  for (const queryWord of queryTokens) {
    for (const faqWord of faqTokens) {
      // Exact match
      if (queryWord === faqWord) {
        matchCount++;
        break;
      }
      // Partial match (one contains the other)
      if (queryWord.includes(faqWord) || faqWord.includes(queryWord)) {
        matchCount += 0.7;
        break;
      }
    }
  }

  // Normalize by the average of both token set sizes
  const avgLength = (queryTokens.length + faqTokens.length) / 2;
  return matchCount / avgLength;
}

module.exports = { matchFAQ, tokenize, calculateSimilarity };
