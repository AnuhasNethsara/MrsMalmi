// ─────────────────────────────────────────────────────────────────────────────
// Application Model — Stores user applications with questions and review status
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const applicationSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  applicantId: { type: String, required: true },
  type: { type: String, required: true },
  answers: [{
    question: { type: String, required: true },
    answer: { type: String, required: true },
  }],
  status: { type: String, enum: ['pending', 'accepted', 'denied'], default: 'pending' },
  reviewedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

applicationSchema.index({ guildId: 1, applicantId: 1, type: 1 });

module.exports = mongoose.model('Application', applicationSchema);
