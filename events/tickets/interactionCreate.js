// ─────────────────────────────────────────────────────────────────────────────
// Event: interactionCreate — Handles ticket button interactions
// ─────────────────────────────────────────────────────────────────────────────

const ticketManager = require('../../services/tickets/ticketManager');
const Ticket = require('../../database/models/Ticket');
const Guild = require('../../database/models/Guild');
const { TICKETS } = require('../../config/constants');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    // Only handle ticket_ prefixed buttons
    if (!customId.startsWith('ticket_')) return;

    try {
      // ── ticket_create_{type} — Create a new ticket ──────────────────────
      if (customId.startsWith('ticket_create_')) {
        await handleCreate(interaction, client);
        return;
      }

      // ── ticket_close — Close the current ticket ─────────────────────────
      if (customId === 'ticket_close') {
        await handleClose(interaction, client);
        return;
      }

      // ── ticket_claim — Claim the current ticket ─────────────────────────
      if (customId === 'ticket_claim') {
        await handleClaim(interaction, client);
        return;
      }
    } catch (err) {
      logger.error(`[Tickets:interactionCreate] Error handling button ${customId}: ${err.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [errorEmbed('An error occurred while processing your request. Please try again.')],
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};

/**
 * Handles ticket creation from panel buttons.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleCreate(interaction, client) {
  const type = interaction.customId.replace('ticket_create_', '');

  // Validate ticket type
  const validTypes = ['support', 'report', 'purchase', 'partnership'];
  if (!validTypes.includes(type)) {
    await interaction.reply({ embeds: [errorEmbed('Invalid ticket type.')], ephemeral: true });
    return;
  }

  // Check if user has too many open tickets
  const openTickets = await Ticket.countDocuments({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    status: { $in: ['open', 'claimed'] },
  });

  if (openTickets >= TICKETS.maxOpenPerUser) {
    await interaction.reply({
      embeds: [errorEmbed(`You already have **${openTickets}** open ticket(s). Maximum allowed is **${TICKETS.maxOpenPerUser}**.`)],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const ticket = await ticketManager.createTicket(interaction.guild, interaction.member, type, client);

    await interaction.editReply({
      embeds: [successEmbed(`Your ticket has been created! Head over to <#${ticket.channelId}>.`)],
    });
  } catch (err) {
    logger.error(`[Tickets:interactionCreate] Error creating ticket: ${err.message}`);
    await interaction.editReply({
      embeds: [errorEmbed(err.message || 'Failed to create ticket. Please try again later.')],
    });
  }
}

/**
 * Handles ticket close button.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleClose(interaction, client) {
  // Find the ticket associated with this channel
  const ticket = await Ticket.findOne({
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    status: { $in: ['open', 'claimed'] },
  });

  if (!ticket) {
    await interaction.reply({
      embeds: [errorEmbed('No open ticket found for this channel.')],
      ephemeral: true,
    });
    return;
  }

  // Check permissions — ticket owner or staff can close
  const guildDoc = await Guild.findOne({ guildId: interaction.guild.id }).lean();
  const staffRoles = guildDoc?.tickets?.staffRoles || [];
  const isStaff = interaction.member.roles.cache.some((role) => staffRoles.includes(role.id));
  const isOwner = ticket.userId === interaction.user.id;

  if (!isStaff && !isOwner && !interaction.member.permissions.has('ManageChannels')) {
    await interaction.reply({
      embeds: [errorEmbed('You do not have permission to close this ticket.')],
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    embeds: [warningEmbed('Closing this ticket and generating transcript...')],
  });

  await ticketManager.closeTicket(interaction.guild, ticket, interaction.user, client);
}

/**
 * Handles ticket claim button.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleClaim(interaction, client) {
  // Find the ticket associated with this channel
  const ticket = await Ticket.findOne({
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    status: 'open',
  });

  if (!ticket) {
    await interaction.reply({
      embeds: [errorEmbed('No open ticket found for this channel, or it has already been claimed.')],
      ephemeral: true,
    });
    return;
  }

  // Check if the user is staff
  const guildDoc = await Guild.findOne({ guildId: interaction.guild.id }).lean();
  const staffRoles = guildDoc?.tickets?.staffRoles || [];
  const isStaff = interaction.member.roles.cache.some((role) => staffRoles.includes(role.id));

  if (!isStaff && !interaction.member.permissions.has('ManageChannels')) {
    await interaction.reply({
      embeds: [errorEmbed('Only staff members can claim tickets.')],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await ticketManager.claimTicket(interaction.guild, ticket, interaction.member, client);

    await interaction.editReply({
      embeds: [successEmbed('You have claimed this ticket.')],
    });
  } catch (err) {
    logger.error(`[Tickets:interactionCreate] Error claiming ticket: ${err.message}`);
    await interaction.editReply({
      embeds: [errorEmbed('Failed to claim the ticket. Please try again.')],
    });
  }
}
