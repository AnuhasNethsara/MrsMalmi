// ─────────────────────────────────────────────────────────────────────────────
// Command: /clear — Bulk delete messages from a channel
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages from a channel')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('Only delete messages from this user').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  permissions: ['ManageMessages'],
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      let messages;

      if (targetUser) {
        // Fetch more messages to filter by user
        const fetched = await interaction.channel.messages.fetch({ limit: 100 });
        const filtered = fetched.filter((msg) => msg.author.id === targetUser.id);
        messages = [...filtered.values()].slice(0, amount);

        // Filter out messages older than 14 days (Discord limitation)
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        messages = messages.filter((msg) => msg.createdTimestamp > twoWeeksAgo);

        if (messages.length === 0) {
          return interaction.editReply({ embeds: [errorEmbed('No recent messages found from that user.')] });
        }

        await interaction.channel.bulkDelete(messages, true);
      } else {
        messages = await interaction.channel.bulkDelete(amount, true);
      }

      const deletedCount = messages.size ?? messages.length;

      await interaction.editReply({
        embeds: [successEmbed(`Deleted **${deletedCount}** message${deletedCount !== 1 ? 's' : ''}${targetUser ? ` from ${targetUser.tag}` : ''}.`)],
      });

      logger.info(`[Clear] ${interaction.user.tag} cleared ${deletedCount} messages in #${interaction.channel.name} (${interaction.guild.id})`);
    } catch (err) {
      logger.error(`[Clear] Error clearing messages: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Failed to delete messages. Messages older than 14 days cannot be bulk deleted.')] });
    }
  },
};
