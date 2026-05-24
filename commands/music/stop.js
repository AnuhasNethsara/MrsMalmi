// ─────────────────────────────────────────────────────────────────────────────
// Command: /stop — Stop playback, clear queue, and leave voice
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../services/music/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback, clear the queue, and leave voice'),

  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue) {
      return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], ephemeral: true });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel.')], ephemeral: true });
    }

    musicManager.stop(interaction.guild.id);

    await interaction.reply({ embeds: [successEmbed('Stopped playback and cleared the queue.')] });
    logger.info(`[Music] ${interaction.user.tag} stopped playback in ${interaction.guild.id}`);
  },
};
