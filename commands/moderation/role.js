// ─────────────────────────────────────────────────────────────────────────────
// Command: /role — Add or remove a role from a user
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a user')
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('Whether to add or remove the role')
        .setRequired(true)
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' },
        )
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to modify roles for').setRequired(true)
    )
    .addRoleOption((option) =>
      option.setName('role').setDescription('The role to add or remove').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  permissions: ['ManageRoles'],
  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const action = interaction.options.getString('action');
    const target = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    // Fetch target member
    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: true });
    }

    // Check if the role is manageable by the bot
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('I cannot manage this role. It is equal to or higher than my highest role.')], ephemeral: true });
    }

    // Check if the role is higher than the moderator's highest role
    if (role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('You cannot manage a role equal to or higher than your highest role.')], ephemeral: true });
    }

    // Prevent managing @everyone or managed roles (bot roles, booster, etc.)
    if (role.managed || role.id === interaction.guild.id) {
      return interaction.reply({ embeds: [errorEmbed('This role cannot be manually assigned or removed.')], ephemeral: true });
    }

    try {
      if (action === 'add') {
        if (targetMember.roles.cache.has(role.id)) {
          return interaction.reply({ embeds: [errorEmbed(`${target.tag} already has the ${role} role.`)], ephemeral: true });
        }
        await targetMember.roles.add(role);
        await interaction.reply({ embeds: [successEmbed(`Added ${role} to **${target.tag}**.`)] });
      } else {
        if (!targetMember.roles.cache.has(role.id)) {
          return interaction.reply({ embeds: [errorEmbed(`${target.tag} does not have the ${role} role.`)], ephemeral: true });
        }
        await targetMember.roles.remove(role);
        await interaction.reply({ embeds: [successEmbed(`Removed ${role} from **${target.tag}**.`)] });
      }

      logger.info(`[Role] ${interaction.user.tag} ${action === 'add' ? 'added' : 'removed'} role ${role.name} ${action === 'add' ? 'to' : 'from'} ${target.tag} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Role] Error managing role: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to manage the role. Please check my permissions.')], ephemeral: true });
    }
  },
};
