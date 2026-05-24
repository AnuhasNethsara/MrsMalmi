// ─────────────────────────────────────────────────────────────────────────────
// Service: Starboard Manager — Tracks star reactions and posts to starboard
// ─────────────────────────────────────────────────────────────────────────────

const { EmbedBuilder } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

/** @type {Map<string, string>} messageId -> starboard message ID */
const starboardMessages = new Map();

/**
 * Gets starboard settings for a guild.
 * @param {string} guildId
 * @returns {Promise<{ channelId: string|null, threshold: number }>}
 */
async function getSettings(guildId) {
  const guild = await Guild.findOne({ guildId }).lean();
  return {
    channelId: guild?.starboard?.channelId || null,
    threshold: guild?.starboard?.threshold || 3,
  };
}

/**
 * Handles a star reaction being added to a message.
 * @param {import('discord.js').MessageReaction} reaction
 * @param {import('discord.js').Client} client
 */
async function handleStarAdd(reaction, client) {
  const { message } = reaction;
  const settings = await getSettings(message.guild.id);

  if (!settings.channelId) return;
  if (message.channel.id === settings.channelId) return; // Don't star starboard messages

  const starCount = reaction.count;
  if (starCount < settings.threshold) return;

  const starboardChannel = await client.channels.fetch(settings.channelId).catch(() => null);
  if (!starboardChannel) return;

  const starEmoji = getStarEmoji(starCount);
  const content = `${starEmoji} **${starCount}** | <#${message.channel.id}>`;

  const embed = new EmbedBuilder()
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
    .setDescription(message.content || '*No text content*')
    .setColor(COLORS.warning)
    .addFields({ name: 'Source', value: `[Jump to message](${message.url})` })
    .setTimestamp(message.createdAt);

  if (message.attachments.size > 0) {
    const img = message.attachments.first();
    if (img.contentType?.startsWith('image/')) {
      embed.setImage(img.url);
    }
  }

  // Check if we already have a starboard message for this
  const existingId = starboardMessages.get(message.id);
  if (existingId) {
    try {
      const existing = await starboardChannel.messages.fetch(existingId).catch(() => null);
      if (existing) {
        await existing.edit({ content, embeds: [embed] });
        return;
      }
    } catch {
      // Message was deleted, create a new one
    }
  }

  // Post new starboard message
  const starMsg = await starboardChannel.send({ content, embeds: [embed] });
  starboardMessages.set(message.id, starMsg.id);

  logger.info(`[Starboard] Message ${message.id} posted to starboard in ${message.guild.id} (${starCount} stars)`);
}

/**
 * Handles a star reaction being removed from a message.
 * @param {import('discord.js').MessageReaction} reaction
 * @param {import('discord.js').Client} client
 */
async function handleStarRemove(reaction, client) {
  const { message } = reaction;
  const settings = await getSettings(message.guild.id);

  if (!settings.channelId) return;

  const starCount = reaction.count;
  const starboardChannel = await client.channels.fetch(settings.channelId).catch(() => null);
  if (!starboardChannel) return;

  const existingId = starboardMessages.get(message.id);
  if (!existingId) return;

  try {
    const existing = await starboardChannel.messages.fetch(existingId).catch(() => null);
    if (!existing) return;

    if (starCount < settings.threshold) {
      // Below threshold — remove from starboard
      await existing.delete();
      starboardMessages.delete(message.id);
      logger.info(`[Starboard] Removed message ${message.id} from starboard (below threshold)`);
    } else {
      // Update count
      const starEmoji = getStarEmoji(starCount);
      await existing.edit({ content: `${starEmoji} **${starCount}** | <#${message.channel.id}>` });
    }
  } catch (err) {
    logger.error(`[Starboard] Error handling star remove: ${err.message}`);
  }
}

/**
 * Returns the appropriate star emoji based on count.
 * @param {number} count
 * @returns {string}
 */
function getStarEmoji(count) {
  if (count >= 20) return '🌟';
  if (count >= 10) return '💫';
  if (count >= 5) return '✨';
  return '⭐';
}

module.exports = {
  handleStarAdd,
  handleStarRemove,
  getSettings,
};
