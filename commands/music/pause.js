// ─────────────────────────────────────────────────────────────────────────────
// Command: /pause — Pause the current playback
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../services/music/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current playback'),

  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    if (!interaction.member.voice.channel) {
      return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel.')], ephemeral: true });
    }

    const success = musicManager.pause(interaction.guild.id);

    if (!success) {
      return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Paused the playback. Use `/resume` to continue.')] });
  },
};
