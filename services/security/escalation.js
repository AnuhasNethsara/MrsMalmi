// ─────────────────────────────────────────────────────────────────────────────
// Escalation Service — Applies progressive punishment based on warning count
// ─────────────────────────────────────────────────────────────────────────────

const User = require('../../database/models/User');
const Punishment = require('../../database/models/Punishment');
const logger = require('../../utils/logger');

// Default timeout duration: 5 minutes (in ms)
const DEFAULT_TIMEOUT_DURATION = 5 * 60 * 1000;

// Default mute duration: 1 hour (in ms)
const DEFAULT_MUTE_DURATION = 60 * 60 * 1000;

/**
 * Applies an escalating punishment based on the user's warning count.
 * Looks up the user's current warnings, determines the appropriate action
 * from the escalation array, applies it, and increments the warning count.
 *
 * Default escalation: ['warn', 'timeout', 'mute', 'kick', 'ban']
 *
 * @param {import('discord.js').Client} client - Discord client
 * @param {import('discord.js').GuildMember} member - The guild member to punish
 * @param {object} guildSettings - The guild settings document
 * @param {string} reason - The reason for the punishment
 * @param {string} filterName - The name of the filter that triggered
 * @returns {Promise<string>} The action that was applied
 */
async function applyEscalation(client, member, guildSettings, reason, filterName) {
  const guildId = member.guild.id;
  const userId = member.id;

  try {
    // Get or create user document
    let userDoc = await User.findOne({ guildId, userId });
    if (!userDoc) {
      userDoc = await User.create({ guildId, userId });
    }

    // Get escalation array from settings or use default
    const escalation = guildSettings?.security?.autoMod?.escalation || ['warn', 'timeout', 'mute', 'kick', 'ban'];

    // Determine the action based on current warning count
    const warningIndex = Math.min(userDoc.warnings, escalation.length - 1);
    const action = escalation[warningIndex];

    // Apply the action
    await executeAction(client, member, action, reason, filterName);

    // Increment warning count
    await User.updateOne(
      { guildId, userId },
      { $inc: { warnings: 1 } }
    );

    // Create a punishment record
    const caseId = await Punishment.getNextCaseId(guildId);
    await Punishment.create({
      caseId,
      guildId,
      userId,
      moderatorId: client.user.id,
      action,
      reason: `[AutoMod:${filterName}] ${reason}`,
      duration: action === 'timeout' ? DEFAULT_TIMEOUT_DURATION : action === 'mute' ? DEFAULT_MUTE_DURATION : null,
      active: true,
    });

    logger.info(
      `[AutoMod:Escalation] Applied "${action}" to ${member.user.tag} in guild ${guildId} (Case #${caseId}) — Filter: ${filterName}, Warnings: ${userDoc.warnings + 1}`
    );

    return action;
  } catch (err) {
    logger.error(`[AutoMod:Escalation] Error applying escalation for ${userId} in guild ${guildId}: ${err.message}`);
    return 'warn';
  }
}

/**
 * Executes the specified moderation action on a member.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 * @param {string} action - The action to execute
 * @param {string} reason - The reason for the action
 * @param {string} filterName - The filter that triggered
 */
async function executeAction(client, member, action, reason, filterName) {
  const fullReason = `[AutoMod:${filterName}] ${reason}`;

  try {
    switch (action) {
      case 'warn':
        // Warn is just a record — no Discord action needed beyond logging
        try {
          await member.send(`⚠️ You have been warned in **${member.guild.name}** for: ${reason}`).catch(() => {});
        } catch {
          // DMs may be disabled
        }
        break;

      case 'timeout':
        if (member.moderatable) {
          await member.timeout(DEFAULT_TIMEOUT_DURATION, fullReason);
        }
        break;

      case 'mute':
        if (member.moderatable) {
          await member.timeout(DEFAULT_MUTE_DURATION, fullReason);
        }
        break;

      case 'kick':
        if (member.kickable) {
          try {
            await member.send(`👢 You have been kicked from **${member.guild.name}** for: ${reason}`).catch(() => {});
          } catch {
            // DMs may be disabled
          }
          await member.kick(fullReason);
        }
        break;

      case 'ban':
        if (member.bannable) {
          try {
            await member.send(`🔨 You have been banned from **${member.guild.name}** for: ${reason}`).catch(() => {});
          } catch {
            // DMs may be disabled
          }
          await member.ban({ reason: fullReason, deleteMessageSeconds: 60 });
        }
        break;

      default:
        logger.warn(`[AutoMod:Escalation] Unknown action "${action}" — defaulting to warn`);
        break;
    }
  } catch (err) {
    logger.error(`[AutoMod:Escalation] Failed to execute action "${action}" on ${member.id}: ${err.message}`);
  }
}

module.exports = { applyEscalation };
