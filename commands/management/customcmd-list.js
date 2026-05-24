// ─────────────────────────────────────────────────────────────────────────────
// Command: /customcmd-list — List all custom commands
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const CustomCommand = require('../../database/models/CustomCommand');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcmd-list')
    .setDescription('List all custom commands in this server'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const commands = await CustomCommand.find({ guildId: interaction.guild.id }).lean();

      if (!commands.length) {
        return interaction.reply({ embeds: [errorEmbed('No custom commands found.')], ephemeral: true });
      }

      const description = commands.map((cmd) => {
        return `\`${cmd.name}\` — ${cmd.response.substring(0, 50)}${cmd.response.length > 50 ? '...' : ''}`;
      }).join('\n');

      const embed = createEmbed({
        title: '📋 Custom Commands',
        description,
        color: COLORS.primary,
        fields: [
          { name: 'Total', value: `${commands.length} command(s)`, inline: true },
        ],
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Failed to load custom commands.')], ephemeral: true });
    }
  },
};
