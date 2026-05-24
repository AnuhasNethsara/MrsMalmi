// ─────────────────────────────────────────────────────────────────────────────
// Reminder Model — Stores user reminders with scheduled delivery times
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const reminderSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String },
  channelId: { type: String },
  message: { type: String, required: true },
  remindAt: { type: Date, required: true, index: true },
  sent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// ── Indexes ───────────────────────────────────────────────────────────────────

// Finding due reminders that haven't been sent yet
reminderSchema.index({ sent: 1, remindAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
