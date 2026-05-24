// ─────────────────────────────────────────────────────────────────────────────
// Command: /nowplaying — Show the currently playing track with progress bar
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../services/music/musicManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const np = musicManager.nowPlaying(interaction.guild.id);

    if (!np) {
      return interaction.reply({ embeds: [errorEmbed('Nothing is currently playing.')], ephemeral: true });
    }

    const { track, startedAt } = np;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const progress = createProgressBar(elapsed, track.duration);

    const embed = createEmbed({
      title: '🎵 Now Playing',
      description: [
        `[${track.title}](${track.url})`,
        '',
        `${progress}`,
        `\`${formatDuration(elapsed)} / ${formatDuration(track.duration)}\``,
      ].join('\n'),
      color: COLORS.primary,
      fields: [
        { name: 'Requested by', value: track.requestedBy, inline: true },
      ],
      thumbnail: track.thumbnail,
    });

    await interaction.reply({ embeds: [embed] });
  },
};

/**
 * Creates a visual progress bar.
 * @param {number} current - Current position in seconds
 * @param {number} total - Total duration in seconds
 * @returns {string}
 */
function createProgressBar(current, total) {
  const barLength = 15;
  const filled = Math.round((current / total) * barLength);
  const empty = barLength - filled;
  return `${'▬'.repeat(filled)}🔘${'▬'.repeat(empty)}`;
}

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
