// ─────────────────────────────────────────────────────────────────────────────
// Service: Auto Voice Manager — Creates temp voice channels on join
// ─────────────────────────────────────────────────────────────────────────────

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../database/models/Guild');
const logger = require('../../utils/logger');

/** @type {Set<string>} Set of temporary channel IDs */
const tempChannels = new Set();

/**
 * Gets the auto voice creator channel for a guild.
 * @param {string} guildId
 * @returns {Promise<string|null>}
 */
async function getCreatorChannel(guildId) {
  const guild = await Guild.findOne({ guildId }).lean();
  return guild?.autoVoice?.channelId || null;
}

/**
 * Creates a temporary voice channel for a user.
 * @param {import('discord.js').VoiceState} newState
 * @returns {Promise<import('discord.js').VoiceChannel|null>}
 */
async function createTempChannel(newState) {
  const { member, guild } = newState;

  const tempChannel = await guild.channels.create({
    name: `${member.displayName}'s Channel`,
    type: ChannelType.GuildVoice,
    parent: newState.channel.parent,
    permissionOverwrites: [
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.Connect,
        ],
      },
      {
        id: guild.id,
        allow: [PermissionFlagsBits.Connect],
      },
    ],
  });

  tempChannels.add(tempChannel.id);
  await member.voice.setChannel(tempChannel);

  logger.info(`[AutoVoice] Created temp channel "${tempChannel.name}" for ${member.user.tag} in ${guild.id}`);
  return tempChannel;
}

/**
 * Checks if a channel is a temp channel and deletes it if empty.
 * @param {import('discord.js').VoiceState} oldState
 */
async function checkAndDelete(oldState) {
  if (!oldState.channel) return;
  if (!tempChannels.has(oldState.channel.id)) return;

  if (oldState.channel.members.size === 0) {
    const channelName = oldState.channel.name;
    await oldState.channel.delete().catch(() => null);
    tempChannels.delete(oldState.channel.id);
    logger.info(`[AutoVoice] Deleted empty temp channel "${channelName}" in ${oldState.guild.id}`);
  }
}

/**
 * Checks if a channel ID is the auto voice creator channel.
 * @param {string} guildId
 * @param {string} channelId
 * @returns {Promise<boolean>}
 */
async function isCreatorChannel(guildId, channelId) {
  const creatorId = await getCreatorChannel(guildId);
  return creatorId === channelId;
}

module.exports = {
  getCreatorChannel,
  createTempChannel,
  checkAndDelete,
  isCreatorChannel,
  tempChannels,
};
