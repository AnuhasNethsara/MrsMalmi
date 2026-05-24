// ─────────────────────────────────────────────────────────────────────────────
// ReactionRole Model — Stores reaction role panel configurations
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const reactionRoleSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['button', 'dropdown'], default: 'button' },
  roles: [{
    roleId: { type: String, required: true },
    emoji: { type: String, default: null },
    label: { type: String, required: true },
    description: { type: String, default: null },
  }],
}, { timestamps: true });

module.exports = mongoose.model('ReactionRole', reactionRoleSchema);
