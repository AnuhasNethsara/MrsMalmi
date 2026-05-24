// ─────────────────────────────────────────────────────────────────────────────
// Ticket Manager — Handles ticket lifecycle (create, close, claim)
// ─────────────────────────────────────────────────────────────────────────────

const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const Ticket = require('../../database/models/Ticket');
const Guild = require('../../database/models/Guild');
const { createEmbed } = require('../../utils/embed');
const { generateTranscript } = require('./transcript');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Creates a new ticket channel and database document.
 * @param {import('discord.js').Guild} guild - The Discord guild
 * @param {import('discord.js').GuildMember} member - The member opening the ticket
 * @param {string} type - Ticket type (support, report, purchase, partnership)
 * @param {import('discord.js').Client} client - The Discord client
 * @returns {Promise<Object>} The created Ticket document
 */
async function createTicket(guild, member, type, client) {
  // Fetch guild settings
  const guildDoc = await Guild.findOne({ guildId: guild.id }).lean();
  const settings = guildDoc?.tickets;

  if (!settings || !settings.enabled) {
    throw new Error('Ticket system is not enabled on this server.');
  }

  // Get next ticket ID
  const ticketId = await Ticket.getNextTicketId(guild.id);

  // Build permission overwrites
  const permissionOverwrites = [
    {
      id: guild.id, // @everyone
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  // Add staff roles to permission overwrites
  if (settings.staffRoles && settings.staffRoles.length > 0) {
    for (const roleId of settings.staffRoles) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  }

  // Create the ticket channel
  const channel = await guild.channels.create({
    name: `ticket-${ticketId}-${member.user.username}`,
    type: ChannelType.GuildText,
    parent: settings.categoryId || null,
    permissionOverwrites,
    topic: `Ticket #${ticketId} | Type: ${type} | User: ${member.user.tag}`,
  });

  // Create the ticket document
  const ticket = await Ticket.create({
    ticketId,
    guildId: guild.id,
    channelId: channel.id,
    userId: member.id,
    type,
    status: 'open',
  });

  // Post welcome embed with claim/close buttons
  const welcomeEmbed = createEmbed({
    title: `🎫 Ticket #${ticketId} — ${capitalize(type)}`,
    description: `Welcome ${member}, a staff member will be with you shortly.\n\nPlease describe your issue in detail.`,
    color: COLORS.primary,
    fields: [
      { name: 'Type', value: capitalize(type), inline: true },
      { name: 'Opened By', value: `${member}`, inline: true },
      { name: 'Status', value: '🟢 Open', inline: true },
    ],
  });

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Claim')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🙋'),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  await channel.send({ embeds: [welcomeEmbed], components: [actionRow] });

  logger.info(`[Tickets] Ticket #${ticketId} created by ${member.user.tag} in guild ${guild.id} (type: ${type})`);
  return ticket;
}

/**
 * Closes a ticket — generates transcript, updates status, deletes channel after delay.
 * @param {import('discord.js').Guild} guild - The Discord guild
 * @param {Object} ticket - The Ticket document
 * @param {import('discord.js').User|import('discord.js').GuildMember} closer - The user closing the ticket
 * @param {import('discord.js').Client} client - The Discord client
 * @returns {Promise<Object>} The updated Ticket document
 */
async function closeTicket(guild, ticket, closer, client) {
  const channel = guild.channels.cache.get(ticket.channelId);

  let transcript = null;

  // Generate transcript if channel still exists
  if (channel) {
    transcript = await generateTranscript(channel);

    // Send closing message
    const closeEmbed = createEmbed({
      title: '🔒 Ticket Closed',
      description: `This ticket has been closed by ${closer}.\nThis channel will be deleted in **5 seconds**.`,
      color: COLORS.error,
    });

    await channel.send({ embeds: [closeEmbed] });

    // Send transcript to configured transcript channel
    const guildDoc = await Guild.findOne({ guildId: guild.id }).lean();
    const transcriptChannelId = guildDoc?.tickets?.transcriptChannelId;

    if (transcriptChannelId) {
      const transcriptChannel = guild.channels.cache.get(transcriptChannelId);
      if (transcriptChannel) {
        const transcriptEmbed = createEmbed({
          title: `📝 Transcript — Ticket #${ticket.ticketId}`,
          description: `**Type:** ${capitalize(ticket.type)}\n**Opened By:** <@${ticket.userId}>\n**Closed By:** ${closer}`,
          color: COLORS.info,
          fields: [
            { name: 'Opened', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: true },
            { name: 'Closed', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          ],
        });

        await transcriptChannel.send({
          embeds: [transcriptEmbed],
          files: [{ attachment: Buffer.from(transcript, 'utf-8'), name: `transcript-${ticket.ticketId}.html` }],
        });
      }
    }

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await channel.delete(`Ticket #${ticket.ticketId} closed`);
      } catch (err) {
        logger.error(`[Tickets] Error deleting channel for ticket #${ticket.ticketId}: ${err.message}`);
      }
    }, 5000);
  }

  // Update ticket document
  const updatedTicket = await Ticket.findOneAndUpdate(
    { guildId: guild.id, ticketId: ticket.ticketId },
    {
      status: 'closed',
      closedAt: new Date(),
      transcript: transcript ? `transcript-${ticket.ticketId}.html` : null,
    },
    { new: true }
  );

  logger.info(`[Tickets] Ticket #${ticket.ticketId} closed by ${closer.tag || closer.user?.tag || 'Unknown'} in guild ${guild.id}`);
  return updatedTicket;
}

/**
 * Claims a ticket — assigns a staff member and updates channel permissions.
 * @param {import('discord.js').Guild} guild - The Discord guild
 * @param {Object} ticket - The Ticket document
 * @param {import('discord.js').GuildMember} staff - The staff member claiming the ticket
 * @param {import('discord.js').Client} client - The Discord client
 * @returns {Promise<Object>} The updated Ticket document
 */
async function claimTicket(guild, ticket, staff, client) {
  const channel = guild.channels.cache.get(ticket.channelId);

  if (channel) {
    // Ensure the staff member has full access
    await channel.permissionOverwrites.edit(staff.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    // Send claim notification
    const claimEmbed = createEmbed({
      title: '🙋 Ticket Claimed',
      description: `This ticket has been claimed by ${staff}.\nThey will be assisting you shortly.`,
      color: COLORS.success,
      fields: [
        { name: 'Staff Member', value: `${staff}`, inline: true },
        { name: 'Status', value: '🟡 Claimed', inline: true },
      ],
    });

    await channel.send({ embeds: [claimEmbed] });
  }

  // Update ticket document
  const updatedTicket = await Ticket.findOneAndUpdate(
    { guildId: guild.id, ticketId: ticket.ticketId },
    { status: 'claimed', claimedBy: staff.id },
    { new: true }
  );

  logger.info(`[Tickets] Ticket #${ticket.ticketId} claimed by ${staff.user.tag} in guild ${guild.id}`);
  return updatedTicket;
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  createTicket,
  closeTicket,
  claimTicket,
};
