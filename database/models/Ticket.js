// ─────────────────────────────────────────────────────────────────────────────
// Ticket Model — Stores support tickets with auto-increment ticket IDs
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketSchema = new Schema({
  ticketId: { type: Number, required: true },
  guildId: { type: String, required: true, index: true },
  channelId: { type: String },
  userId: { type: String, required: true },
  type: {
    type: String,
    enum: ['support', 'report', 'purchase', 'partnership'],
    default: 'support'
  },
  status: {
    type: String,
    enum: ['open', 'claimed', 'closed'],
    default: 'open'
  },
  claimedBy: { type: String },
  transcript: { type: String },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date }
});

// ── Indexes ───────────────────────────────────────────────────────────────────

// Unique ticket per guild
ticketSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });

// Finding tickets by status within a guild
ticketSchema.index({ guildId: 1, status: 1 });

// ── Static Methods ────────────────────────────────────────────────────────────

/**
 * Get the next available ticket ID for a guild.
 * Finds the highest existing ticketId and returns +1, or 1 if none exist.
 * @param {string} guildId - The guild to get the next ticket ID for
 * @returns {Promise<number>} The next ticket ID
 */
ticketSchema.statics.getNextTicketId = async function (guildId) {
  const lastTicket = await this.findOne({ guildId })
    .sort({ ticketId: -1 })
    .select('ticketId')
    .lean();

  return lastTicket ? lastTicket.ticketId + 1 : 1;
};

module.exports = mongoose.model('Ticket', ticketSchema);
