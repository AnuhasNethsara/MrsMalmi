// ─────────────────────────────────────────────────────────────────────────────
// Command: /reactionrole-add — Add a role to an existing reaction role panel
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const reactionRoleManager = require('../../services/reactionRoles/reactionRoleManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole-add')
    .setDescription('Add a role to an existing reaction role panel')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Message ID of the panel').setRequired(true)
    )
    .addRoleOption((option) =>
      option.setName('role').setDescription('Role to add').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('label').setDescription('Button/option label').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('emoji').setDescription('Emoji for the button/option').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  permissions: ['ManageRoles'],
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const messageId = interaction.options.getString('messageid');
    const role = interaction.options.getRole('role');
    const label = interaction.options.getString('label');
    const emoji = interaction.options.getString('emoji') || null;

    try {
      const result = await reactionRoleManager.addRole(
        interaction.guild.id,
        messageId,
        { roleId: role.id, label, emoji, description: null },
        client,
      );

      if (!result.success) {
        return interaction.reply({ embeds: [errorEmbed(result.message)], ephemeral: true });
      }

      await interaction.reply({ embeds: [successEmbed(`Added **${role.name}** to the panel.`)], ephemeral: true });
      logger.info(`[ReactionRoles] ${interaction.user.tag} added role ${role.name} to panel ${messageId}`);
    } catch (err) {
      logger.error(`[ReactionRoles] Error adding role: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to add role to panel.')], ephemeral: true });
    }
  },
};
