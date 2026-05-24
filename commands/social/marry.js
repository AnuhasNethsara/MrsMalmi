// ─────────────────────────────────────────────────────────────────────────────
// Command: /marry — Send a marriage proposal
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../database/models/User');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Propose marriage to another user')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to propose to').setRequired(true)
    ),

  cooldown: 30,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot marry yourself.')], ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('You cannot marry a bot.')], ephemeral: true });
    }

    try {
      // Check if either user is already married
      const proposer = await User.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
      if (proposer?.marriedTo) {
        return interaction.reply({ embeds: [errorEmbed('You are already married! Use `/divorce` first.')], ephemeral: true });
      }

      const targetUser = await User.findOne({ guildId: interaction.guild.id, userId: target.id });
      if (targetUser?.marriedTo) {
        return interaction.reply({ embeds: [errorEmbed(`**${target.tag}** is already married.`)], ephemeral: true });
      }

      const embed = createEmbed({
        title: '💍 Marriage Proposal',
        description: `**${interaction.user.tag}** has proposed to **${target.tag}**!\n\n${target}, do you accept?`,
        color: COLORS.primary,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 256 }),
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`marry_accept_${interaction.user.id}_${target.id}`)
          .setLabel('💕 Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`marry_deny_${interaction.user.id}_${target.id}`)
          .setLabel('💔 Deny')
          .setStyle(ButtonStyle.Danger),
      );

      await interaction.reply({ embeds: [embed], components: [row] });

      // Wait for response
      const filter = (i) => i.user.id === target.id && i.customId.startsWith('marry_');
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

      collector.on('collect', async (i) => {
        if (i.customId.startsWith('marry_accept')) {
          // Marry them
          await User.findOneAndUpdate(
            { guildId: interaction.guild.id, userId: interaction.user.id },
            { $set: { marriedTo: target.id } },
            { upsert: true },
          );
          await User.findOneAndUpdate(
            { guildId: interaction.guild.id, userId: target.id },
            { $set: { marriedTo: interaction.user.id } },
            { upsert: true },
          );

          const successEm = createEmbed({
            title: '💒 Married!',
            description: `**${interaction.user.tag}** and **${target.tag}** are now married! 🎉`,
            color: COLORS.success,
          });

          await i.update({ embeds: [successEm], components: [] });
          logger.info(`[Social] ${interaction.user.tag} married ${target.tag} in ${interaction.guild.id}`);
        } else {
          await i.update({
            embeds: [createEmbed({ description: `💔 **${target.tag}** denied the proposal.`, color: COLORS.error })],
            components: [],
          });
        }
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.editReply({
            embeds: [createEmbed({ description: '⏰ The proposal timed out.', color: COLORS.warning })],
            components: [],
          }).catch(() => {});
        }
      });
    } catch (err) {
      logger.error(`[Social] Error in marry: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true });
    }
  },
};
