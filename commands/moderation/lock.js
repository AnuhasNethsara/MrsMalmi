// ─────────────────────────────────────────────────────────────────────────────
// Command: /lock — Lock a channel (prevent @everyone from sending messages)
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel (prevent members from sending messages)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  permissions: ['ManageChannels'],
  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const channel = interaction.channel;
    const everyoneRole = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
      });

      await interaction.reply({ embeds: [successEmbed('🔒 This channel has been locked. Members can no longer send messages.')] });
      logger.info(`[Lock] ${interaction.user.tag} locked #${channel.name} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Lock] Error locking channel: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to lock the channel. Please check my permissions.')], ephemeral: true });
    }
  },
};
