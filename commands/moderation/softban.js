// ─────────────────────────────────────────────────────────────────────────────
// Command: /softban — Ban and immediately unban to delete messages
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { moderationEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a user (deletes their messages)')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to softban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the softban').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  permissions: ['BanMembers'],
  cooldown: 0,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot softban yourself.')], ephemeral: true });
    }

    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (targetMember) {
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ embeds: [errorEmbed('You cannot softban a member with equal or higher role.')], ephemeral: true });
      }
      if (!targetMember.bannable) {
        return interaction.reply({ embeds: [errorEmbed('I cannot ban this user.')], ephemeral: true });
      }
    }

    try {
      await interaction.guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: `[Softban] ${reason}` });
      await interaction.guild.members.unban(target.id, 'Softban — automatic unban');

      const embed = moderationEmbed({
        action: 'Softban',
        moderator: interaction.user.tag,
        target: target.tag,
        reason,
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Softban] ${interaction.user.tag} softbanned ${target.tag} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Softban] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to softban the user.')], ephemeral: true });
    }
  },
};
