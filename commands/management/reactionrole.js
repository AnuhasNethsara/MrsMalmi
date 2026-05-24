// ─────────────────────────────────────────────────────────────────────────────
// Command: /reactionrole create — Create a reaction role panel
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const reactionRoleManager = require('../../services/reactionRoles/reactionRoleManager');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Create a reaction role panel')
    .addStringOption((option) =>
      option.setName('type').setDescription('Panel type').setRequired(true)
        .addChoices(
          { name: 'Button', value: 'button' },
          { name: 'Dropdown', value: 'dropdown' },
        )
    )
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Channel to post the panel in').setRequired(true)
    )
    .addRoleOption((option) =>
      option.setName('role1').setDescription('First role').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('label1').setDescription('Label for first role').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('emoji1').setDescription('Emoji for first role').setRequired(false)
    )
    .addRoleOption((option) =>
      option.setName('role2').setDescription('Second role').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('label2').setDescription('Label for second role').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('emoji2').setDescription('Emoji for second role').setRequired(false)
    )
    .addRoleOption((option) =>
      option.setName('role3').setDescription('Third role').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('label3').setDescription('Label for third role').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('emoji3').setDescription('Emoji for third role').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  permissions: ['ManageRoles'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    // Collect roles from options
    const roles = [];
    for (let i = 1; i <= 3; i++) {
      const role = interaction.options.getRole(`role${i}`);
      const label = interaction.options.getString(`label${i}`);
      if (role && label) {
        roles.push({
          roleId: role.id,
          label,
          emoji: interaction.options.getString(`emoji${i}`) || null,
          description: null,
        });
      }
    }

    if (roles.length === 0) {
      return interaction.reply({ embeds: [errorEmbed('You must provide at least one role.')], ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      await reactionRoleManager.createPanel(channel, type, roles);

      await interaction.editReply({
        embeds: [successEmbed(`Reaction role panel created in ${channel}! Use \`/reactionrole-add\` to add more roles.`)],
      });

      logger.info(`[ReactionRoles] ${interaction.user.tag} created ${type} panel in ${interaction.guild.id}#${channel.name}`);
    } catch (err) {
      logger.error(`[ReactionRoles] Error creating panel: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Failed to create reaction role panel.')] });
    }
  },
};
