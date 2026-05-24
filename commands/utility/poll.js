// ─────────────────────────────────────────────────────────────────────────────
// Command: /poll — Create a poll with button voting
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll with button voting')
    .addStringOption((option) =>
      option.setName('question').setDescription('The poll question').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('option1').setDescription('First option').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('option2').setDescription('Second option').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('option3').setDescription('Third option (optional)').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('option4').setDescription('Fourth option (optional)').setRequired(false)
    ),

  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const question = interaction.options.getString('question');
    const options = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
    ].filter(Boolean);

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const votes = new Map(); // optionIndex -> Set of userIds

    options.forEach((_, i) => votes.set(i, new Set()));

    const buildDescription = () => {
      return options
        .map((opt, i) => `${emojis[i]} **${opt}** — ${votes.get(i).size} vote(s)`)
        .join('\n');
    };

    const embed = createEmbed({
      title: `📊 ${question}`,
      description: buildDescription(),
      color: COLORS.primary,
      footer: 'Poll ends in 24 hours • Click a button to vote',
    });

    const row = new ActionRowBuilder();
    options.forEach((opt, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_${i}`)
          .setLabel(opt.length > 80 ? opt.substring(0, 77) + '...' : opt)
          .setEmoji(emojis[i])
          .setStyle(ButtonStyle.Secondary)
      );
    });

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Collect votes for 24 hours
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 24 * 60 * 60 * 1000, // 24 hours
    });

    collector.on('collect', async (btnInteraction) => {
      const optionIndex = parseInt(btnInteraction.customId.split('_')[1]);
      const userId = btnInteraction.user.id;

      // Remove previous vote if any
      for (const [key, voters] of votes) {
        voters.delete(userId);
      }

      // Add new vote
      votes.get(optionIndex).add(userId);

      // Update embed
      const updatedEmbed = createEmbed({
        title: `📊 ${question}`,
        description: buildDescription(),
        color: COLORS.primary,
        footer: 'Poll ends in 24 hours • Click a button to vote',
      });

      await btnInteraction.update({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      const finalEmbed = createEmbed({
        title: `📊 ${question} (Ended)`,
        description: buildDescription(),
        color: COLORS.warning,
        footer: 'This poll has ended',
      });

      // Disable all buttons
      const disabledRow = new ActionRowBuilder();
      options.forEach((opt, i) => {
        disabledRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_${i}`)
            .setLabel(opt.length > 80 ? opt.substring(0, 77) + '...' : opt)
            .setEmoji(emojis[i])
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
      });

      await reply.edit({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => {});
    });
  },
};
