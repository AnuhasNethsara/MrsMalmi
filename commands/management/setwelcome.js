// ─────────────────────────────────────────────────────────────────────────────
// Command: /setwelcome — Configure the welcome system
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Configure the welcome and leave system')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the welcome/leave message channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('The channel for welcome messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Which channel to set')
            .addChoices(
              { name: 'Welcome', value: 'welcome' },
              { name: 'Leave', value: 'leave' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription('Set the welcome message template')
        .addStringOption((option) =>
          option
            .setName('text')
            .setDescription('Welcome message. Placeholders: {user}, {server}, {memberCount}, {user.tag}, {user.id}')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('leave-message')
        .setDescription('Set the leave message template')
        .addStringOption((option) =>
          option
            .setName('text')
            .setDescription('Leave message. Placeholders: {user}, {server}, {memberCount}, {user.tag}, {user.id}')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Enable or disable the welcome system')
        .addStringOption((option) =>
          option
            .setName('feature')
            .setDescription('Which feature to toggle')
            .addChoices(
              { name: 'Welcome System', value: 'enabled' },
              { name: 'Welcome Card', value: 'cardEnabled' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('auto-role')
        .setDescription('Add or remove an auto-role for new members')
        .addRoleOption((option) =>
          option.setName('role').setDescription('The role to add/remove').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Add or remove the role')
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' }
            )
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    try {
      // Ensure guild document exists
      let guildDoc = await Guild.findOne({ guildId: interaction.guild.id });
      if (!guildDoc) {
        guildDoc = await Guild.create({ guildId: interaction.guild.id });
      }

      switch (subcommand) {
        case 'channel':
          await handleChannel(interaction, guildDoc);
          break;
        case 'message':
          await handleMessage(interaction, guildDoc);
          break;
        case 'leave-message':
          await handleLeaveMessage(interaction, guildDoc);
          break;
        case 'toggle':
          await handleToggle(interaction, guildDoc);
          break;
        case 'auto-role':
          await handleAutoRole(interaction, guildDoc);
          break;
        default:
          await interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')], ephemeral: true });
      }
    } catch (err) {
      logger.error(`[SetWelcome] Error in /${subcommand}: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred while updating settings.')], ephemeral: true }).catch(() => {});
    }
  },
};

/**
 * Handles the /setwelcome channel subcommand.
 */
async function handleChannel(interaction, guildDoc) {
  const channel = interaction.options.getChannel('channel');
  const type = interaction.options.getString('type') || 'welcome';

  if (type === 'leave') {
    guildDoc.welcome.leaveChannelId = channel.id;
  } else {
    guildDoc.welcome.channelId = channel.id;
  }

  await guildDoc.save();

  const label = type === 'leave' ? 'Leave' : 'Welcome';
  await interaction.reply({
    embeds: [successEmbed(`${label} channel set to ${channel}.`)],
  });

  logger.info(`[SetWelcome] ${interaction.user.tag} set ${label} channel to #${channel.name} in guild ${interaction.guild.id}`);
}

/**
 * Handles the /setwelcome message subcommand.
 */
async function handleMessage(interaction, guildDoc) {
  const text = interaction.options.getString('text');

  guildDoc.welcome.message = text;
  await guildDoc.save();

  await interaction.reply({
    embeds: [successEmbed(`Welcome message updated.\n\n**Preview:** ${text}`)],
  });

  logger.info(`[SetWelcome] ${interaction.user.tag} updated welcome message in guild ${interaction.guild.id}`);
}

/**
 * Handles the /setwelcome leave-message subcommand.
 */
async function handleLeaveMessage(interaction, guildDoc) {
  const text = interaction.options.getString('text');

  guildDoc.welcome.leaveMessage = text;
  await guildDoc.save();

  await interaction.reply({
    embeds: [successEmbed(`Leave message updated.\n\n**Preview:** ${text}`)],
  });

  logger.info(`[SetWelcome] ${interaction.user.tag} updated leave message in guild ${interaction.guild.id}`);
}

/**
 * Handles the /setwelcome toggle subcommand.
 */
async function handleToggle(interaction, guildDoc) {
  const feature = interaction.options.getString('feature');

  const currentValue = guildDoc.welcome[feature] || false;
  guildDoc.welcome[feature] = !currentValue;
  await guildDoc.save();

  const featureLabel = feature === 'cardEnabled' ? 'Welcome Card' : 'Welcome System';
  const state = !currentValue ? 'enabled' : 'disabled';

  await interaction.reply({
    embeds: [successEmbed(`${featureLabel} has been **${state}**.`)],
  });

  logger.info(`[SetWelcome] ${interaction.user.tag} ${state} ${featureLabel} in guild ${interaction.guild.id}`);
}

/**
 * Handles the /setwelcome auto-role subcommand.
 */
async function handleAutoRole(interaction, guildDoc) {
  const role = interaction.options.getRole('role');
  const action = interaction.options.getString('action');

  if (!guildDoc.welcome.autoRoles) {
    guildDoc.welcome.autoRoles = [];
  }

  if (action === 'add') {
    if (guildDoc.welcome.autoRoles.includes(role.id)) {
      return interaction.reply({
        embeds: [infoEmbed(`${role} is already an auto-role.`)],
        ephemeral: true,
      });
    }

    guildDoc.welcome.autoRoles.push(role.id);
    await guildDoc.save();

    await interaction.reply({
      embeds: [successEmbed(`${role} has been added as an auto-role.`)],
    });
  } else {
    const index = guildDoc.welcome.autoRoles.indexOf(role.id);
    if (index === -1) {
      return interaction.reply({
        embeds: [infoEmbed(`${role} is not currently an auto-role.`)],
        ephemeral: true,
      });
    }

    guildDoc.welcome.autoRoles.splice(index, 1);
    await guildDoc.save();

    await interaction.reply({
      embeds: [successEmbed(`${role} has been removed from auto-roles.`)],
    });
  }

  logger.info(`[SetWelcome] ${interaction.user.tag} ${action}ed auto-role ${role.name} in guild ${interaction.guild.id}`);
}
