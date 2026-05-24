// ─────────────────────────────────────────────────────────────────────────────
// User Model — Stores per-guild user data (XP, levels, economy, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },

  // ── Leveling ────────────────────────────────────────────────────────────────
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },

  // ── Moderation ──────────────────────────────────────────────────────────────
  warnings: { type: Number, default: 0 },

  // ── Economy ─────────────────────────────────────────────────────────────────
  coins: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: { type: Date },

  // ── Cooldowns ───────────────────────────────────────────────────────────────
  lastXpGrant: { type: Date }
}, { timestamps: true });

// Compound unique index: one user document per guild
userSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
