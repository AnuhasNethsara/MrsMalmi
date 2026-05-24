// ─────────────────────────────────────────────────────────────────────────────
// Command: /nick — Change a user's nickname
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change a user\'s nickname')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to change nickname for').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('nickname').setDescription('The new nickname (leave empty to reset)').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  permissions: ['ManageNicknames'],
  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname') || null;

    // Fetch target member
    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: true });
    }

    // Check hierarchy
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('You cannot change the nickname of a member with equal or higher role.')], ephemeral: true });
    }

    if (!targetMember.manageable) {
      return interaction.reply({ embeds: [errorEmbed('I cannot change this user\'s nickname. They may have a higher role than me.')], ephemeral: true });
    }

    try {
      const oldNick = targetMember.nickname || targetMember.user.username;
      await targetMember.setNickname(nickname);

      if (nickname) {
        await interaction.reply({ embeds: [successEmbed(`Changed **${target.tag}**'s nickname from \`${oldNick}\` to \`${nickname}\`.`)] });
      } else {
        await interaction.reply({ embeds: [successEmbed(`Reset **${target.tag}**'s nickname.`)] });
      }

      logger.info(`[Nick] ${interaction.user.tag} changed ${target.tag}'s nickname to "${nickname || 'reset'}" in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Nick] Error changing nickname: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to change the nickname. Please check my permissions.')], ephemeral: true });
    }
  },
};
