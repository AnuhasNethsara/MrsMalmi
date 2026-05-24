// ─────────────────────────────────────────────────────────────────────────────
// Command: /ticketpanel — Post a ticket creation panel with buttons
// ─────────────────────────────────────────────────────────────────────────────

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { errorEmbed, successEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Post a ticket creation panel with buttons for each ticket type')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  permissions: ['ManageChannels'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const panelEmbed = createEmbed({
      title: '🎫 Support Tickets',
      description: 'Need help? Click one of the buttons below to open a ticket.\n\nPlease select the category that best matches your request:',
      color: COLORS.primary,
      fields: [
        { name: '🛠️ Support', value: 'General help and questions', inline: true },
        { name: '🚨 Report', value: 'Report a user or issue', inline: true },
        { name: '💰 Purchase', value: 'Purchase inquiries', inline: true },
        { name: '🤝 Partnership', value: 'Partnership proposals', inline: true },
      ],
    });

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_create_support')
        .setLabel('Support')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🛠️'),
      new ButtonBuilder()
        .setCustomId('ticket_create_report')
        .setLabel('Report')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚨'),
      new ButtonBuilder()
        .setCustomId('ticket_create_purchase')
        .setLabel('Purchase')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💰'),
      new ButtonBuilder()
        .setCustomId('ticket_create_partnership')
        .setLabel('Partnership')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🤝')
    );

    try {
      await interaction.channel.send({ embeds: [panelEmbed], components: [actionRow] });
      await interaction.reply({
        embeds: [successEmbed('Ticket panel has been posted in this channel.')],
        ephemeral: true,
      });

      logger.info(`[TicketPanel] Panel posted by ${interaction.user.tag} in #${interaction.channel.name} (guild: ${interaction.guild.id})`);
    } catch (err) {
      logger.error(`[TicketPanel] Error posting panel: ${err.message}`);
      await interaction.reply({
        embeds: [errorEmbed('Failed to post the ticket panel. Please check my permissions.')],
        ephemeral: true,
      });
    }
  },
};
