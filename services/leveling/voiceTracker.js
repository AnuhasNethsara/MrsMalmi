// ─────────────────────────────────────────────────────────────────────────────
// Voice Tracker — Tracks voice channel time and grants XP accordingly
// ─────────────────────────────────────────────────────────────────────────────

const User = require('../../database/models/User');
const Guild = require('../../database/models/Guild');
const { LEVELING } = require('../../config/constants');
const { checkLevelUp } = require('./levelManager');
const logger = require('../../utils/logger');

/**
 * In-memory map to track voice session start times.
 * Key: `${guildId}:${userId}`, Value: timestamp (ms)
 */
const voiceSessions = new Map();

/**
 * Starts tracking a member's voice session.
 *
 * @param {import('discord.js').GuildMember} member - The member who joined voice
 * @param {import('discord.js').Client} client - Discord client
 */
function startTracking(member, client) {
  const key = `${member.guild.id}:${member.id}`;

  // Don't track bots
  if (member.user.bot) return;

  // Don't double-track
  if (voiceSessions.has(key)) return;

  voiceSessions.set(key, Date.now());
  logger.debug(`[VoiceTracker] Started tracking ${member.user.tag} in guild ${member.guild.id}`);
}

/**
 * Stops tracking a member's voice session and grants XP based on time spent.
 *
 * @param {import('discord.js').GuildMember} member - The member who left voice
 * @param {import('discord.js').Client} client - Discord client
 * @returns {Promise<void>}
 */
async function stopTracking(member, client) {
  const key = `${member.guild.id}:${member.id}`;

  // Don't track bots
  if (member.user.bot) return;

  const startTime = voiceSessions.get(key);
  if (!startTime) return;

  // Remove from tracking
  voiceSessions.delete(key);

  const guildId = member.guild.id;
  const userId = member.id;

  try {
    // Calculate time spent in minutes
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);

    // Minimum 1 minute to earn XP
    if (minutes < 1) return;

    // Fetch guild settings
    const guildDoc = await Guild.findOne({ guildId }).lean();
    const levelSettings = guildDoc?.leveling;

    if (!levelSettings || !levelSettings.enabled) return;

    // Calculate voice XP
    const xpPerMinute = levelSettings.voiceXpPerMinute || LEVELING.voiceXpPerMinute;
    const xpGained = minutes * xpPerMinute;

    // Update user document
    let userDoc = await User.findOne({ guildId, userId });
    if (!userDoc) {
      userDoc = await User.create({ guildId, userId });
    }

    await User.updateOne(
      { guildId, userId },
      { $inc: { xp: xpGained, voiceMinutes: minutes } }
    );

    // Re-fetch and check level up
    const updatedUser = await User.findOne({ guildId, userId });
    await checkLevelUp(updatedUser, member.guild, member, client);

    logger.debug(`[VoiceTracker] Granted ${xpGained} XP to ${member.user.tag} for ${minutes} minutes in voice`);
  } catch (err) {
    logger.error(`[VoiceTracker] Error granting voice XP to ${userId} in guild ${guildId}: ${err.message}`);
  }
}

/**
 * Gets the current voice sessions map (for debugging/monitoring).
 * @returns {Map<string, number>}
 */
function getSessions() {
  return voiceSessions;
}

module.exports = { startTracking, stopTracking, getSessions };
