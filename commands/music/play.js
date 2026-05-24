// ─────────────────────────────────────────────────────────────────────────────
// Command: /play — Search YouTube and play audio in voice channel
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../services/music/musicManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption((option) =>
      option.setName('query').setDescription('Song name or YouTube URL').setRequired(true)
    ),

  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel to use this command.')], ephemeral: true });
    }

    const botPermissions = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions.has('Connect') || !botPermissions.has('Speak')) {
      return interaction.reply({ embeds: [errorEmbed('I need **Connect** and **Speak** permissions in your voice channel.')], ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const track = await musicManager.play(interaction.guild, voiceChannel, query, interaction.user.tag);

      const queue = musicManager.getQueue(interaction.guild.id);
      const position = queue ? queue.tracks.length : 1;

      const embed = createEmbed({
        title: position === 1 ? '🎵 Now Playing' : '🎵 Added to Queue',
        description: `[${track.title}](${track.url})`,
        color: COLORS.primary,
        fields: [
          { name: 'Duration', value: formatDuration(track.duration), inline: true },
          { name: 'Requested by', value: track.requestedBy, inline: true },
          position > 1 ? { name: 'Position', value: `#${position}`, inline: true } : null,
        ].filter(Boolean),
        thumbnail: track.thumbnail,
      });

      await interaction.editReply({ embeds: [embed] });
      logger.info(`[Music] ${interaction.user.tag} played "${track.title}" in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Music] Error playing track: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed(err.message || 'Failed to play the track.')] });
    }
  },
};

/**
 * Formats seconds into MM:SS or HH:MM:SS.
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
