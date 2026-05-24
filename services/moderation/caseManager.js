// ─────────────────────────────────────────────────────────────────────────────
// Case Manager — Handles case lookups, notes, and deactivation
// ─────────────────────────────────────────────────────────────────────────────

const Punishment = require('../../database/models/Punishment');

/**
 * Gets a single moderation case by guild and case ID.
 * @param {string} guildId - The guild ID
 * @param {number} caseId - The case ID
 * @returns {Promise<Object|null>} The case document or null
 */
async function getCase(guildId, caseId) {
  return Punishment.findOne({ guildId, caseId }).lean();
}

/**
 * Gets all moderation cases for a user in a guild.
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of case documents
 */
async function getUserCases(guildId, userId) {
  return Punishment.find({ guildId, userId }).sort({ caseId: -1 }).lean();
}

/**
 * Adds a note to an existing case.
 * @param {string} guildId - The guild ID
 * @param {number} caseId - The case ID
 * @param {string} authorId - The note author's user ID
 * @param {string} content - The note content
 * @returns {Promise<Object|null>} The updated case document or null
 */
async function addNote(guildId, caseId, authorId, content) {
  return Punishment.findOneAndUpdate(
    { guildId, caseId },
    {
      $push: {
        notes: {
          content,
          authorId,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  );
}

/**
 * Deactivates a case (sets active to false).
 * @param {string} guildId - The guild ID
 * @param {number} caseId - The case ID
 * @returns {Promise<Object|null>} The updated case document or null
 */
async function deactivateCase(guildId, caseId) {
  return Punishment.findOneAndUpdate(
    { guildId, caseId },
    { $set: { active: false } },
    { new: true }
  );
}

module.exports = {
  getCase,
  getUserCases,
  addNote,
  deactivateCase,
};
