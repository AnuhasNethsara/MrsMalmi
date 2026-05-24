// ─────────────────────────────────────────────────────────────────────────────
// Command: /help — Shows all commands or details for a specific command
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all commands or details for a specific command')
    .addStringOption((option) =>
      option.setName('command').setDescription('The command to get details for').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const commandName = interaction.options.getString('command');

    if (commandName) {
      // Show details for a specific command
      const command = client.commands.get(commandName.toLowerCase());

      if (!command) {
        return interaction.reply({
          embeds: [errorEmbed(`Command \`${commandName}\` not found.`)],
          ephemeral: true,
        });
      }

      const embed = createEmbed({
        title: `Command: /${command.data.name}`,
        description: command.data.description,
        color: COLORS.info,
        fields: [
          { name: 'Cooldown', value: `${command.cooldown || 3} seconds`, inline: true },
          { name: 'Category', value: command.category || 'Unknown', inline: true },
        ],
      });

      // Add options if any
      const options = command.data.options;
      if (options && options.length > 0) {
        const optionsList = options
          .map((opt) => `\`${opt.name}\` — ${opt.description}${opt.required ? ' *(required)*' : ''}`)
          .join('\n');
        embed.addFields({ name: 'Options', value: optionsList, inline: false });
      }

      return interaction.reply({ embeds: [embed] });
    }

    // Show all commands grouped by category
    const categories = new Map();

    client.commands.forEach((cmd) => {
      const category = cmd.category || 'Other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(cmd);
    });

    const fields = [];
    const categoryEmojis = {
      utility: '🔧',
      moderation: '🛡️',
      fun: '🎮',
      management: '⚙️',
      security: '🔒',
      tickets: '🎫',
    };

    for (const [category, commands] of categories) {
      const emoji = categoryEmojis[category.toLowerCase()] || '📁';
      const commandList = commands
        .map((cmd) => `\`/${cmd.data.name}\``)
        .join(', ');

      fields.push({
        name: `${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
        value: commandList,
        inline: false,
      });
    }

    const embed = createEmbed({
      title: '📖 Command List',
      description: 'Use `/help <command>` to get details about a specific command.',
      color: COLORS.info,
      fields,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
