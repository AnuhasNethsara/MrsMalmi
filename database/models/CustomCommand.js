// ─────────────────────────────────────────────────────────────────────────────
// CustomCommand Model — Stores guild-specific custom text commands
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const customCommandSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  response: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// ── Indexes ───────────────────────────────────────────────────────────────────
customCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CustomCommand', customCommandSchema);
