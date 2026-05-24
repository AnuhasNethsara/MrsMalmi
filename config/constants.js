const COLORS = {
  primary: 0x5865f2, // Discord blurple — brand color
  success: 0x57f287, // Green
  warning: 0xfee75c, // Yellow
  error: 0xed4245, // Red
  info: 0x5865f2, // Blue
  moderation: 0x992d22, // Dark red
};

const ANTI_RAID = {
  joinThreshold: 10, // Max joins before triggering raid mode
  joinWindow: 10000, // Time window in ms (10 seconds)
  mentionThreshold: 8, // Max mentions in a single message
  webhookThreshold: 3, // Max webhooks created in short period
  deletionThreshold: 5, // Max channel/role deletions before action
  deletionWindow: 30000, // Deletion tracking window in ms (30 seconds)
};

const VERIFICATION = {
  minAccountAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  timeout: 60 * 60 * 1000, // 1 hour in ms
  maxAttempts: 3, // Max failed verification attempts before block
};

const AUTO_MOD = {
  spamThreshold: 5, // Messages within window to trigger spam
  spamWindow: 5000, // Spam detection window in ms (5 seconds)
  capsThreshold: 0.7, // 70% caps ratio to trigger
  capsMinLength: 10, // Minimum message length for caps check
  duplicateThreshold: 3, // Repeated messages to trigger
  duplicateWindow: 30000, // Duplicate tracking window in ms (30 seconds)
  mentionLimit: 5, // Max mentions per message
};

const LEVELING = {
  xpPerMessage: { min: 15, max: 25 }, // Random XP range per message
  xpCooldown: 60000, // 1 minute cooldown between XP grants
  voiceXpPerMinute: 5, // XP earned per minute in voice
  dailyCoins: 100, // Coins granted per daily claim
  streakBonus: 25, // Extra coins per streak day
};

const TICKETS = {
  autoCloseHours: 48, // Hours of inactivity before auto-close
  maxOpenPerUser: 3, // Max concurrent open tickets per user
};

const COOLDOWNS = {
  defaultCommand: 3, // Default command cooldown in seconds
  modCommand: 0, // Moderator command cooldown in seconds
};

const BRANDING = {
  name: 'Antigravity',
  footer: 'Powered by ShiftLK Network',
  developer: 'Anuhas Nethsara',
};

module.exports = {
  COLORS,
  ANTI_RAID,
  VERIFICATION,
  AUTO_MOD,
  LEVELING,
  TICKETS,
  COOLDOWNS,
  BRANDING,
};
