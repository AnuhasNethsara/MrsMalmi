// ─────────────────────────────────────────────────────────────────────────────
// Guild Settings Model — Stores per-guild configuration for all bot features
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const guildSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  prefix: { type: String, default: '!' },

  // ── Security Settings ───────────────────────────────────────────────────────
  security: {
    antiRaid: {
      enabled: { type: Boolean, default: false },
      joinThreshold: { type: Number, default: 10 },
      joinWindow: { type: Number, default: 10000 },
      mentionThreshold: { type: Number, default: 8 },
      action: { type: String, enum: ['lockdown', 'kick', 'ban', 'alert'], default: 'lockdown' },
      whitelistedUsers: [String],
      alertChannelId: String
    },
    verification: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['captcha', 'button', 'timer'], default: 'button' },
      minAccountAge: { type: Number, default: 7 * 24 * 60 * 60 * 1000 },
      timeout: { type: Number, default: 60 * 60 * 1000 },
      verifiedRoleId: String,
      unverifiedRoleId: String,
      channelId: String
    },
    autoMod: {
      enabled: { type: Boolean, default: false },
      filters: {
        spam: { type: Boolean, default: true },
        badWords: { type: Boolean, default: true },
        toxicity: { type: Boolean, default: false },
        scamLinks: { type: Boolean, default: true },
        inviteLinks: { type: Boolean, default: true },
        excessiveCaps: { type: Boolean, default: true },
        duplicateMessages: { type: Boolean, default: true },
        mentionSpam: { type: Boolean, default: true }
      },
      bannedWords: [String],
      escalation: { type: [String], default: ['warn', 'timeout', 'mute', 'kick', 'ban'] },
      whitelist: {
        channels: [String],
        roles: [String]
      }
    },
    scamProtection: {
      enabled: { type: Boolean, default: true },
      blacklistedDomains: [String]
    }
  },

  // ── Welcome Settings ────────────────────────────────────────────────────────
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    message: { type: String, default: 'Welcome {user} to {server}! You are member #{memberCount}.' },
    leaveMessage: { type: String, default: '{user} has left the server.' },
    leaveChannelId: String,
    autoRoles: [String],
    cardEnabled: { type: Boolean, default: false }
  },

  // ── Logging Settings ────────────────────────────────────────────────────────
  logging: {
    enabled: { type: Boolean, default: false },
    channels: {
      moderation: String,
      messages: String,
      members: String,
      voice: String,
      server: String
    }
  },

  // ── Ticket Settings ─────────────────────────────────────────────────────────
  tickets: {
    enabled: { type: Boolean, default: false },
    categoryId: String,
    types: { type: [String], default: ['support', 'report', 'purchase', 'partnership'] },
    autoCloseHours: { type: Number, default: 48 },
    staffRoles: [String],
    transcriptChannelId: String
  },

  // ── Leveling Settings ───────────────────────────────────────────────────────
  leveling: {
    enabled: { type: Boolean, default: false },
    xpPerMessage: { min: { type: Number, default: 15 }, max: { type: Number, default: 25 } },
    xpCooldown: { type: Number, default: 60000 },
    voiceXpPerMinute: { type: Number, default: 5 },
    rewardRoles: [{ level: Number, roleId: String }],
    announcementChannelId: String,
    ignoredChannels: [String],
    ignoredRoles: [String]
  },

  // ── AI Settings ─────────────────────────────────────────────────────────────
  ai: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: 'openai' },
    rateLimit: { type: Number, default: 10 },
    faq: [{ question: String, answer: String }]
  }
}, { timestamps: true });

module.exports = mongoose.model('Guild', guildSchema);
