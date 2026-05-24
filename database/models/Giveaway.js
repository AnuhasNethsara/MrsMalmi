// ─────────────────────────────────────────────────────────────────────────────
// Giveaway Model — Stores giveaway data with participants and requirements
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const giveawaySchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  prize: { type: String, required: true },
  hostId: { type: String, required: true },
  winners: { type: Number, default: 1 },
  endsAt: { type: Date, required: true, index: true },
  ended: { type: Boolean, default: false },
  participants: [{ type: String }],
  requirements: {
    role: { type: String, default: null },
    level: { type: Number, default: null },
    messages: { type: Number, default: null },
  },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
giveawaySchema.index({ ended: 1, endsAt: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);
