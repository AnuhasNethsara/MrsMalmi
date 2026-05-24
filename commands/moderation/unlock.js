// ─────────────────────────────────────────────────────────────────────────────
// Command: /unlock — Unlock a channel (allow @everyone to send messages)
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel (allow members to send messages)')
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
        SendMessages: null, // Reset to default (inherit from category/server)
      });

      await interaction.reply({ embeds: [successEmbed('🔓 This channel has been unlocked. Members can send messages again.')] });
      logger.info(`[Unlock] ${interaction.user.tag} unlocked #${channel.name} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Unlock] Error unlocking channel: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to unlock the channel. Please check my permissions.')], ephemeral: true });
    }
  },
};
