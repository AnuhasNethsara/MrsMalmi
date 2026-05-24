// ─────────────────────────────────────────────────────────────────────────────
// Command: /skip — Skip the current track
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../services/music/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.tracks.length) {
      return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], ephemeral: true });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel.')], ephemeral: true });
    }

    const skipped = musicManager.skip(interaction.guild.id);

    await interaction.reply({ embeds: [successEmbed(`Skipped **${skipped.title}**.`)] });
    logger.info(`[Music] ${interaction.user.tag} skipped "${skipped.title}" in ${interaction.guild.id}`);
  },
};
