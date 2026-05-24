// ─────────────────────────────────────────────────────────────────────────────
// Service: Giveaway Manager — Create, end, and reroll giveaways
// ─────────────────────────────────────────────────────────────────────────────

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Giveaway = require('../../database/models/Giveaway');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Creates a new giveaway.
 * @param {Object} options
 * @param {import('discord.js').TextChannel} options.channel - Channel to post in
 * @param {string} options.prize - Prize description
 * @param {string} options.hostId - Host user ID
 * @param {number} options.winners - Number of winners
 * @param {Date} options.endsAt - End date
 * @param {Object} [options.requirements] - Entry requirements
 * @returns {Promise<import('mongoose').Document>}
 */
async function createGiveaway({ channel, prize, hostId, winners, endsAt, requirements }) {
  const embed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY 🎉')
    .setDescription([
      `**Prize:** ${prize}`,
      `**Winners:** ${winners}`,
      `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>`,
      `**Hosted by:** <@${hostId}>`,
      requirements?.role ? `\n**Required Role:** <@&${requirements.role}>` : '',
    ].filter(Boolean).join('\n'))
    .setColor(COLORS.primary)
    .setFooter({ text: 'Click the button below to enter!' })
    .setTimestamp(endsAt);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel('🎉 Enter Giveaway')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('giveaway_leave')
      .setLabel('Leave')
      .setStyle(ButtonStyle.Secondary),
  );

  const message = await channel.send({ embeds: [embed], components: [row] });

  const giveaway = await Giveaway.create({
    guildId: channel.guild.id,
    channelId: channel.id,
    messageId: message.id,
    prize,
    hostId,
    winners,
    endsAt,
    requirements: requirements || {},
  });

  logger.info(`[Giveaway] Created giveaway "${prize}" in ${channel.guild.id} (ends ${endsAt.toISOString()})`);
  return giveaway;
}

/**
 * Ends a giveaway and picks winners.
 * @param {import('mongoose').Document} giveaway - Giveaway document
 * @param {import('discord.js').Client} client - Discord client
 * @returns {Promise<string[]>} Array of winner IDs
 */
async function endGiveaway(giveaway, client) {
  if (giveaway.ended) return [];

  const winnerIds = pickWinners(giveaway.participants, giveaway.winners);

  giveaway.ended = true;
  await giveaway.save();

  // Update the giveaway message
  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (channel) {
      const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (message) {
        const winnersText = winnerIds.length > 0
          ? winnerIds.map((id) => `<@${id}>`).join(', ')
          : 'No valid entries.';

        const embed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY ENDED 🎉')
          .setDescription([
            `**Prize:** ${giveaway.prize}`,
            `**Winner(s):** ${winnersText}`,
            `**Hosted by:** <@${giveaway.hostId}>`,
            `**Entries:** ${giveaway.participants.length}`,
          ].join('\n'))
          .setColor(COLORS.success)
          .setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Giveaway Ended')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        await message.edit({ embeds: [embed], components: [disabledRow] });

        if (winnerIds.length > 0) {
          await channel.send({
            content: `🎉 Congratulations ${winnersText}! You won **${giveaway.prize}**!`,
          });
        }
      }
    }
  } catch (err) {
    logger.error(`[Giveaway] Error updating ended giveaway message: ${err.message}`);
  }

  logger.info(`[Giveaway] Ended giveaway "${giveaway.prize}" in ${giveaway.guildId} — Winners: ${winnerIds.join(', ') || 'none'}`);
  return winnerIds;
}

/**
 * Rerolls winners for an ended giveaway.
 * @param {string} guildId
 * @param {string} messageId
 * @param {import('discord.js').Client} client
 * @returns {Promise<{ success: boolean, winners?: string[], message?: string }>}
 */
async function rerollGiveaway(guildId, messageId, client) {
  const giveaway = await Giveaway.findOne({ guildId, messageId });
  if (!giveaway) return { success: false, message: 'Giveaway not found.' };
  if (!giveaway.ended) return { success: false, message: 'Giveaway has not ended yet.' };
  if (giveaway.participants.length === 0) return { success: false, message: 'No participants to reroll.' };

  const winnerIds = pickWinners(giveaway.participants, giveaway.winners);

  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (channel && winnerIds.length > 0) {
      const winnersText = winnerIds.map((id) => `<@${id}>`).join(', ');
      await channel.send({
        content: `🎉 New winner(s) for **${giveaway.prize}**: ${winnersText}! Congratulations!`,
      });
    }
  } catch (err) {
    logger.error(`[Giveaway] Error sending reroll message: ${err.message}`);
  }

  return { success: true, winners: winnerIds };
}

/**
 * Picks random winners from participants.
 * @param {string[]} participants
 * @param {number} count
 * @returns {string[]}
 */
function pickWinners(participants, count) {
  if (participants.length === 0) return [];
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
  createGiveaway,
  endGiveaway,
  rerollGiveaway,
};
