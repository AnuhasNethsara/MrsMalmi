// ─────────────────────────────────────────────────────────────────────────────
// Command: /remind — Set a reminder
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const ms = require('ms');
const Reminder = require('../../database/models/Reminder');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption((option) =>
      option.setName('time').setDescription('When to remind you (e.g. 10m, 1h, 2d)').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('message').setDescription('What to remind you about').setRequired(true)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const timeStr = interaction.options.getString('time');
    const message = interaction.options.getString('message');

    const duration = ms(timeStr);

    if (!duration || duration < 10000 || duration > 30 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid time. Please provide a duration between 10 seconds and 30 days (e.g. `10m`, `1h`, `2d`).')],
        ephemeral: true,
      });
    }

    const remindAt = new Date(Date.now() + duration);

    await Reminder.create({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      message,
      remindAt,
    });

    const embed = successEmbed(
      `I'll remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>\n**Message:** ${message}`
    );

    await interaction.reply({ embeds: [embed] });
  },
};
