// ─────────────────────────────────────────────────────────────────────────────
// Welcome Manager — Handles welcome/leave messages with placeholder substitution
// ─────────────────────────────────────────────────────────────────────────────

const { AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Substitutes placeholders in a message template.
 * Supported placeholders: {user}, {server}, {memberCount}, {user.tag}, {user.id}
 *
 * @param {string} template - The message template with placeholders
 * @param {import('discord.js').GuildMember} member - The guild member
 * @param {import('discord.js').Guild} guild - The guild
 * @returns {string} The message with placeholders replaced
 */
function substitutePlaceholders(template, member, guild) {
  if (!template) return '';

  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{server}/g, guild.name)
    .replace(/{memberCount}/g, guild.memberCount.toString())
    .replace(/{user\.tag}/g, member.user.tag)
    .replace(/{user\.id}/g, member.id);
}

/**
 * Sends a welcome message to the configured channel.
 *
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').GuildMember} member - The new member
 * @param {object} settings - The guild welcome settings
 * @param {Buffer|null} [cardBuffer] - Optional welcome card image buffer
 * @returns {Promise<void>}
 */
async function sendWelcome(guild, member, settings, cardBuffer = null) {
  try {
    const channelId = settings.channelId;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      logger.warn(`[Welcome] Welcome channel ${channelId} not found in guild ${guild.id}`);
      return;
    }

    const message = substitutePlaceholders(
      settings.message || 'Welcome {user} to {server}! You are member #{memberCount}.',
      member,
      guild
    );

    const embed = createEmbed({
      title: '👋 Welcome!',
      description: message,
      color: COLORS.success,
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
    });

    const payload = { embeds: [embed] };

    // Attach welcome card if provided
    if (cardBuffer) {
      const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });
      embed.setImage('attachment://welcome-card.png');
      payload.files = [attachment];
    }

    await channel.send(payload);
    logger.info(`[Welcome] Sent welcome message for ${member.user.tag} in guild ${guild.id}`);
  } catch (err) {
    logger.error(`[Welcome] Error sending welcome message for ${member.user?.tag}: ${err.message}`);
  }
}

/**
 * Sends a leave message to the configured channel.
 *
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').GuildMember} member - The member who left
 * @param {object} settings - The guild welcome settings
 * @returns {Promise<void>}
 */
async function sendLeave(guild, member, settings) {
  try {
    const channelId = settings.leaveChannelId || settings.channelId;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      logger.warn(`[Welcome] Leave channel ${channelId} not found in guild ${guild.id}`);
      return;
    }

    const message = substitutePlaceholders(
      settings.leaveMessage || '{user} has left the server.',
      member,
      guild
    );

    const embed = createEmbed({
      title: '👋 Goodbye!',
      description: message,
      color: COLORS.error,
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
    });

    await channel.send({ embeds: [embed] });
    logger.info(`[Welcome] Sent leave message for ${member.user.tag} in guild ${guild.id}`);
  } catch (err) {
    logger.error(`[Welcome] Error sending leave message for ${member.user?.tag}: ${err.message}`);
  }
}

module.exports = { sendWelcome, sendLeave, substitutePlaceholders };
