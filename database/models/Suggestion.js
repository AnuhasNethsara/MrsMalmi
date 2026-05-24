// ─────────────────────────────────────────────────────────────────────────────
// Suggestion Model — Stores user suggestions with voting and status tracking
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const suggestionSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  userId: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  votes: {
    up: [{ type: String }],
    down: [{ type: String }],
  },
  response: { type: String, default: null },
  respondedBy: { type: String, default: null },
}, { timestamps: true });

suggestionSchema.index({ guildId: 1, messageId: 1 });

module.exports = mongoose.model('Suggestion', suggestionSchema);
