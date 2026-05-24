// ─────────────────────────────────────────────────────────────────────────────
// Command: /reactionrole-remove — Remove a role from a reaction role panel
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const reactionRoleManager = require('../../services/reactionRoles/reactionRoleManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole-remove')
    .setDescription('Remove a role from a reaction role panel')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Message ID of the panel').setRequired(true)
    )
    .addRoleOption((option) =>
      option.setName('role').setDescription('Role to remove').setRequired(true)
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

    try {
      const result = await reactionRoleManager.removeRole(interaction.guild.id, messageId, role.id, client);

      if (!result.success) {
        return interaction.reply({ embeds: [errorEmbed(result.message)], ephemeral: true });
      }

      await interaction.reply({ embeds: [successEmbed(`Removed **${role.name}** from the panel.`)], ephemeral: true });
      logger.info(`[ReactionRoles] ${interaction.user.tag} removed role ${role.name} from panel ${messageId}`);
    } catch (err) {
      logger.error(`[ReactionRoles] Error removing role: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to remove role from panel.')], ephemeral: true });
    }
  },
};
