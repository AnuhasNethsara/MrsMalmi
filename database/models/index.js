// ─────────────────────────────────────────────────────────────────────────────
// Database Models — Barrel export for all Mongoose models
// ─────────────────────────────────────────────────────────────────────────────

const Guild = require('./Guild');
const User = require('./User');
const Punishment = require('./Punishment');
const Ticket = require('./Ticket');
const Reminder = require('./Reminder');
const Giveaway = require('./Giveaway');
const ReactionRole = require('./ReactionRole');
const CustomCommand = require('./CustomCommand');
const Suggestion = require('./Suggestion');
const Application = require('./Application');

module.exports = {
  Guild,
  User,
  Punishment,
  Ticket,
  Reminder,
  Giveaway,
  ReactionRole,
  CustomCommand,
  Suggestion,
  Application,
};
