// ─────────────────────────────────────────────────────────────────────────────
// Level Manager — Core leveling logic (XP grants, level calculations)
// ─────────────────────────────────────────────────────────────────────────────

const User = require('../../database/models/User');
const Guild = require('../../database/models/Guild');
const { LEVELING } = require('../../config/constants');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Calculates the total XP required to reach a given level.
 * Formula: 5*n^2 + 50*n + 100
 *
 * @param {number} n - The level number
 * @returns {number} XP required for that level
 */
function xpForLevel(n) {
  return 5 * (n * n) + 50 * n + 100;
}

/**
 * Calculates the current level from total accumulated XP.
 *
 * @param {number} xp - Total XP accumulated
 * @returns {number} The current level
 */
function getLevelFromXP(xp) {
  let level = 0;
  let remaining = xp;

  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }

  return level;
}

/**
 * Grants XP to a user for sending a message.
 * Checks cooldown, grants random XP within configured range, and checks for level up.
 *
 * @param {import('discord.js').Message} message - The message that triggered XP grant
 * @param {import('discord.js').Client} client - Discord client
 * @returns {Promise<void>}
 */
async function grantMessageXP(message, client) {
  const guildId = message.guild.id;
  const userId = message.author.id;

  try {
    // Fetch guild settings for leveling config
    const guildDoc = await Guild.findOne({ guildId }).lean();
    const levelSettings = guildDoc?.leveling;

    if (!levelSettings || !levelSettings.enabled) return;

    // Check if channel or role is ignored
    if (levelSettings.ignoredChannels?.includes(message.channel.id)) return;
    if (message.member && levelSettings.ignoredRoles?.length > 0) {
      const memberRoles = message.member.roles.cache.map((r) => r.id);
      const isIgnored = levelSettings.ignoredRoles.some((roleId) => memberRoles.includes(roleId));
      if (isIgnored) return;
    }

    // Get or create user document
    let userDoc = await User.findOne({ guildId, userId });
    if (!userDoc) {
      userDoc = await User.create({ guildId, userId });
    }

    // Check cooldown
    const cooldown = levelSettings.xpCooldown || LEVELING.xpCooldown;
    if (userDoc.lastXpGrant) {
      const elapsed = Date.now() - new Date(userDoc.lastXpGrant).getTime();
      if (elapsed < cooldown) return;
    }

    // Calculate random XP
    const minXp = levelSettings.xpPerMessage?.min || LEVELING.xpPerMessage.min;
    const maxXp = levelSettings.xpPerMessage?.max || LEVELING.xpPerMessage.max;
    const xpGained = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

    // Update user XP and message count
    await User.updateOne(
      { guildId, userId },
      {
        $inc: { xp: xpGained, totalMessages: 1 },
        $set: { lastXpGrant: new Date() },
      }
    );

    // Re-fetch to check level up
    const updatedUser = await User.findOne({ guildId, userId });
    await checkLevelUp(updatedUser, message.guild, message.member, client);
  } catch (err) {
    logger.error(`[LevelManager] Error granting XP to ${userId} in guild ${guildId}: ${err.message}`);
  }
}

/**
 * Checks if a user has leveled up and handles announcements and role rewards.
 *
 * @param {object} userDoc - The user document from database
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').GuildMember} member - The guild member
 * @param {import('discord.js').Client} client - Discord client
 * @returns {Promise<void>}
 */
async function checkLevelUp(userDoc, guild, member, client) {
  try {
    const newLevel = getLevelFromXP(userDoc.xp);

    // No level change
    if (newLevel <= userDoc.level) return;

    // Update level in database
    await User.updateOne(
      { guildId: guild.id, userId: userDoc.userId },
      { $set: { level: newLevel } }
    );

    // Fetch guild settings for announcement channel and reward roles
    const guildDoc = await Guild.findOne({ guildId: guild.id }).lean();
    const levelSettings = guildDoc?.leveling;

    // Send level-up announcement
    const announcementChannelId = levelSettings?.announcementChannelId;
    if (announcementChannelId) {
      const channel = guild.channels.cache.get(announcementChannelId);
      if (channel) {
        const embed = createEmbed({
          title: '🎉 Level Up!',
          description: `Congratulations ${member}! You've reached **Level ${newLevel}**!`,
          color: COLORS.success,
          thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
        });

        await channel.send({ embeds: [embed] }).catch((err) => {
          logger.error(`[LevelManager] Failed to send level-up announcement: ${err.message}`);
        });
      }
    }

    // Assign reward roles
    if (levelSettings?.rewardRoles?.length > 0) {
      for (const reward of levelSettings.rewardRoles) {
        if (reward.level === newLevel) {
          const role = guild.roles.cache.get(reward.roleId);
          if (role && role.editable && member) {
            await member.roles.add(role, `[Leveling] Reached level ${newLevel}`).catch((err) => {
              logger.error(`[LevelManager] Failed to assign reward role ${reward.roleId}: ${err.message}`);
            });
          }
        }
      }
    }

    logger.info(`[LevelManager] ${member.user.tag} leveled up to ${newLevel} in guild ${guild.id}`);
  } catch (err) {
    logger.error(`[LevelManager] Error checking level up for ${userDoc?.userId}: ${err.message}`);
  }
}

module.exports = { grantMessageXP, checkLevelUp, xpForLevel, getLevelFromXP };
