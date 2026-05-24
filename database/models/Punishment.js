// ─────────────────────────────────────────────────────────────────────────────
// Punishment Model — Stores moderation cases with auto-increment case IDs
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const punishmentSchema = new Schema({
  caseId: { type: Number, required: true },
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true },
  action: {
    type: String,
    enum: ['warn', 'timeout', 'mute', 'kick', 'ban', 'unmute', 'unban'],
    required: true
  },
  reason: { type: String, default: 'No reason provided' },
  duration: { type: Number, default: null },
  expiresAt: { type: Date },
  active: { type: Boolean, default: true },
  notes: [{
    content: { type: String },
    authorId: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// ── Indexes ───────────────────────────────────────────────────────────────────

// Unique case per guild
punishmentSchema.index({ guildId: 1, caseId: 1 }, { unique: true });

// User history lookups
punishmentSchema.index({ guildId: 1, userId: 1 });

// Finding expired punishments
punishmentSchema.index({ active: 1, expiresAt: 1 });

// ── Static Methods ────────────────────────────────────────────────────────────

/**
 * Get the next available case ID for a guild.
 * Finds the highest existing caseId and returns +1, or 1 if none exist.
 * @param {string} guildId - The guild to get the next case ID for
 * @returns {Promise<number>} The next case ID
 */
punishmentSchema.statics.getNextCaseId = async function (guildId) {
  const lastCase = await this.findOne({ guildId })
    .sort({ caseId: -1 })
    .select('caseId')
    .lean();

  return lastCase ? lastCase.caseId + 1 : 1;
};

module.exports = mongoose.model('Punishment', punishmentSchema);
