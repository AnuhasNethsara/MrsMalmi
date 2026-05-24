// ─────────────────────────────────────────────────────────────────────────────
// Database Models — Barrel export for all Mongoose models
// ─────────────────────────────────────────────────────────────────────────────

const Guild = require('./Guild');
const User = require('./User');
const Punishment = require('./Punishment');
const Ticket = require('./Ticket');
const Reminder = require('./Reminder');

module.exports = {
  Guild,
  User,
  Punishment,
  Ticket,
  Reminder
};
