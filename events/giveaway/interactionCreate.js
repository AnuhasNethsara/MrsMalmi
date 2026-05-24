// ─────────────────────────────────────────────────────────────────────────────
// Event: interactionCreate — Handles giveaway button clicks (enter/leave)
// ─────────────────────────────────────────────────────────────────────────────

const Giveaway = require('../../database/models/Giveaway');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    const { customId } = interaction;
    if (!customId.startsWith('giveaway_')) return;

    try {
      const giveaway = await Giveaway.findOne({
        messageId: interaction.message.id,
        ended: false,
      });

      if (!giveaway) {
        return interaction.reply({ embeds: [errorEmbed('This giveaway has ended.')], ephemeral: true });
      }

      // Check role requirement
      if (giveaway.requirements?.role) {
        const hasRole = interaction.member.roles.cache.has(giveaway.requirements.role);
        if (!hasRole) {
          return interaction.reply({
            embeds: [errorEmbed(`You need the <@&${giveaway.requirements.role}> role to enter.`)],
            ephemeral: true,
          });
        }
      }

      if (customId === 'giveaway_enter') {
        if (giveaway.participants.includes(interaction.user.id)) {
          return interaction.reply({ embeds: [errorEmbed('You have already entered this giveaway.')], ephemeral: true });
        }

        giveaway.participants.push(interaction.user.id);
        await giveaway.save();

        await interaction.reply({
          embeds: [successEmbed(`You have entered the giveaway for **${giveaway.prize}**! 🎉\nTotal entries: ${giveaway.participants.length}`)],
          ephemeral: true,
        });

        logger.info(`[Giveaway] ${interaction.user.tag} entered giveaway ${giveaway.messageId}`);
      } else if (customId === 'giveaway_leave') {
        const index = giveaway.participants.indexOf(interaction.user.id);
        if (index === -1) {
          return interaction.reply({ embeds: [errorEmbed('You are not in this giveaway.')], ephemeral: true });
        }

        giveaway.participants.splice(index, 1);
        await giveaway.save();

        await interaction.reply({
          embeds: [successEmbed('You have left the giveaway.')],
          ephemeral: true,
        });

        logger.info(`[Giveaway] ${interaction.user.tag} left giveaway ${giveaway.messageId}`);
      }
    } catch (err) {
      logger.error(`[Giveaway] Error handling button: ${err.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true }).catch(() => {});
      }
    }
  },
};
