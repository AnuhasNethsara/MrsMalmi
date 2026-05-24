// ─────────────────────────────────────────────────────────────────────────────
// Command: /warnings — View a user's moderation case history
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const caseManager = require('../../services/moderation/caseManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View a user\'s moderation case history')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to check').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  permissions: ['ModerateMembers'],
  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const cases = await caseManager.getUserCases(interaction.guild.id, target.id);

    if (!cases || cases.length === 0) {
      return interaction.reply({ embeds: [errorEmbed(`No moderation cases found for ${target.tag}.`)], ephemeral: true });
    }

    const casesPerPage = 5;
    const totalPages = Math.ceil(cases.length / casesPerPage);
    let currentPage = 0;

    function buildPage(page) {
      const start = page * casesPerPage;
      const pageCases = cases.slice(start, start + casesPerPage);

      const description = pageCases.map((c) => {
        const status = c.active ? '🔴 Active' : '🟢 Resolved';
        const duration = c.duration ? ` | Duration: ${require('ms')(c.duration, { long: true })}` : '';
        return `**Case #${c.caseId}** — ${c.action.toUpperCase()}\n` +
          `> Reason: ${c.reason}\n` +
          `> Moderator: <@${c.moderatorId}>${duration}\n` +
          `> Status: ${status} | <t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:R>`;
      }).join('\n\n');

      return createEmbed({
        title: `Moderation History — ${target.tag}`,
        description,
        color: COLORS.moderation,
        footer: `Page ${page + 1}/${totalPages} • ${cases.length} total cases`,
      });
    }

    function buildButtons(page) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('warnings_prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('warnings_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1),
      );
    }

    const reply = await interaction.reply({
      embeds: [buildPage(currentPage)],
      components: totalPages > 1 ? [buildButtons(currentPage)] : [],
      fetchReply: true,
    });

    if (totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120_000, // 2 minutes
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'warnings_prev') {
        currentPage = Math.max(0, currentPage - 1);
      } else if (i.customId === 'warnings_next') {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }

      await i.update({
        embeds: [buildPage(currentPage)],
        components: [buildButtons(currentPage)],
      });
    });

    collector.on('end', async () => {
      await reply.edit({ components: [] }).catch(() => {});
    });
  },
};
