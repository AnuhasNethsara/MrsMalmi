// ─────────────────────────────────────────────────────────────────────────────
// Command: /ticket — Open a new support ticket
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const ticketManager = require('../../services/tickets/ticketManager');
const Ticket = require('../../database/models/Ticket');
const { TICKETS } = require('../../config/constants');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open a new support ticket')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('The type of ticket to open')
        .setRequired(true)
        .addChoices(
          { name: 'Support', value: 'support' },
          { name: 'Report', value: 'report' },
          { name: 'Purchase', value: 'purchase' },
          { name: 'Partnership', value: 'partnership' }
        )
    ),

  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const type = interaction.options.getString('type');

    // Check if user has too many open tickets
    const openTickets = await Ticket.countDocuments({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      status: { $in: ['open', 'claimed'] },
    });

    if (openTickets >= TICKETS.maxOpenPerUser) {
      return interaction.reply({
        embeds: [errorEmbed(`You already have **${openTickets}** open ticket(s). Maximum allowed is **${TICKETS.maxOpenPerUser}**.`)],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const ticket = await ticketManager.createTicket(interaction.guild, interaction.member, type, client);

      await interaction.editReply({
        embeds: [successEmbed(`Your ticket has been created! Head over to <#${ticket.channelId}>.`)],
      });
    } catch (err) {
      logger.error(`[Ticket Command] Error creating ticket: ${err.message}`);
      await interaction.editReply({
        embeds: [errorEmbed(err.message || 'Failed to create ticket. Please try again later.')],
      });
    }
  },
};
