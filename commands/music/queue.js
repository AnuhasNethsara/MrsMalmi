// ─────────────────────────────────────────────────────────────────────────────
// Command: /queue — Show the current music queue with pagination
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../services/music/musicManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.tracks.length) {
      return interaction.reply({ embeds: [errorEmbed('The queue is empty.')], ephemeral: true });
    }

    const tracks = queue.tracks;
    const itemsPerPage = 10;
    const pages = Math.ceil(tracks.length / itemsPerPage);
    const page = 1;

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentTracks = tracks.slice(start, end);

    const description = currentTracks.map((track, index) => {
      const position = start + index;
      const prefix = position === 0 ? '▶️' : `**${position}.**`;
      const duration = formatDuration(track.duration);
      return `${prefix} [${track.title}](${track.url}) — \`${duration}\` (${track.requestedBy})`;
    }).join('\n');

    const totalDuration = tracks.reduce((acc, t) => acc + t.duration, 0);

    const embed = createEmbed({
      title: '🎶 Music Queue',
      description,
      color: COLORS.primary,
      fields: [
        { name: 'Total Tracks', value: `${tracks.length}`, inline: true },
        { name: 'Total Duration', value: formatDuration(totalDuration), inline: true },
        { name: 'Page', value: `${page}/${pages}`, inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
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
