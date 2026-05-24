// ─────────────────────────────────────────────────────────────────────────────
// Command: /volume — Set the playback volume
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../services/music/musicManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume')
    .addIntegerOption((option) =>
      option.setName('level').setDescription('Volume level (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
    ),

  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const level = interaction.options.getInteger('level');

    if (!interaction.member.voice.channel) {
      return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel.')], ephemeral: true });
    }

    const success = musicManager.setVolume(interaction.guild.id, level);

    if (!success) {
      return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], ephemeral: true });
    }

    const volumeBar = '█'.repeat(Math.floor(level / 10)) + '░'.repeat(10 - Math.floor(level / 10));
    await interaction.reply({ embeds: [successEmbed(`Volume set to **${level}%**\n\`${volumeBar}\``)] });
  },
};
