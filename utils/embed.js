const { EmbedBuilder } = require('discord.js');
const { COLORS, BRANDING } = require('../config/constants');

/**
 * Creates a base embed with consistent bot branding.
 * @param {Object} options - Embed options
 * @param {string} [options.title] - Embed title
 * @param {string} [options.description] - Embed description
 * @param {number} [options.color] - Embed color (defaults to COLORS.primary)
 * @param {Array} [options.fields] - Array of { name, value, inline } field objects
 * @param {string} [options.thumbnail] - Thumbnail URL
 * @param {string} [options.image] - Image URL
 * @param {string} [options.footer] - Footer text (defaults to BRANDING.footer)
 * @param {boolean} [options.timestamp] - Whether to include timestamp (defaults to true)
 * @returns {EmbedBuilder}
 */
function createEmbed({ title, description, color, fields, thumbnail, image, footer, timestamp = true } = {}) {
  const embed = new EmbedBuilder()
    .setColor(color ?? COLORS.primary)
    .setFooter({ text: footer ?? BRANDING.footer });

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (timestamp) embed.setTimestamp();

  if (fields && fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

/**
 * Creates a success embed (green) with ✅ prefix.
 * @param {string} description - Success message
 * @returns {EmbedBuilder}
 */
function successEmbed(description) {
  return createEmbed({
    description: `✅ ${description}`,
    color: COLORS.success,
  });
}

/**
 * Creates an error embed (red) with ❌ prefix.
 * @param {string} description - Error message
 * @returns {EmbedBuilder}
 */
function errorEmbed(description) {
  return createEmbed({
    description: `❌ ${description}`,
    color: COLORS.error,
  });
}

/**
 * Creates a warning embed (yellow) with ⚠️ prefix.
 * @param {string} description - Warning message
 * @returns {EmbedBuilder}
 */
function warningEmbed(description) {
  return createEmbed({
    description: `⚠️ ${description}`,
    color: COLORS.warning,
  });
}

/**
 * Creates an info embed (blue/primary) with ℹ️ prefix.
 * @param {string} description - Info message
 * @returns {EmbedBuilder}
 */
function infoEmbed(description) {
  return createEmbed({
    description: `ℹ️ ${description}`,
    color: COLORS.info,
  });
}

/**
 * Creates a formatted moderation action embed.
 * @param {Object} options - Moderation embed options
 * @param {string} options.action - The moderation action (e.g. 'Ban', 'Kick', 'Mute')
 * @param {string} options.moderator - Moderator tag or mention
 * @param {string} options.target - Target user tag or mention
 * @param {string} [options.reason] - Reason for the action
 * @param {number|string} [options.caseId] - Case ID number
 * @param {string} [options.duration] - Duration string (e.g. '24h', '7d')
 * @returns {EmbedBuilder}
 */
function moderationEmbed({ action, moderator, target, reason, caseId, duration }) {
  const fields = [
    { name: 'Action', value: action, inline: true },
    { name: 'Moderator', value: moderator, inline: true },
    { name: 'Target', value: target, inline: true },
  ];

  if (reason) {
    fields.push({ name: 'Reason', value: reason, inline: false });
  }

  if (duration) {
    fields.push({ name: 'Duration', value: duration, inline: true });
  }

  if (caseId !== undefined && caseId !== null) {
    fields.push({ name: 'Case ID', value: `#${caseId}`, inline: true });
  }

  return createEmbed({
    title: `Moderation | ${action}`,
    color: COLORS.moderation,
    fields,
  });
}

module.exports = {
  createEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  moderationEmbed,
};
