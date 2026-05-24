// ─────────────────────────────────────────────────────────────────────────────
// Event: interactionCreate — Handles reaction role button/dropdown interactions
// ─────────────────────────────────────────────────────────────────────────────

const ReactionRole = require('../../database/models/ReactionRole');
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
    // Handle button interactions
    if (interaction.isButton() && interaction.customId.startsWith('rr_')) {
      await handleButton(interaction);
      return;
    }

    // Handle dropdown interactions
    if (interaction.isStringSelectMenu() && interaction.customId === 'rr_dropdown') {
      await handleDropdown(interaction);
      return;
    }
  },
};

/**
 * Handles reaction role button clicks.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleButton(interaction) {
  const roleId = interaction.customId.replace('rr_', '');

  try {
    const panel = await ReactionRole.findOne({ messageId: interaction.message.id });
    if (!panel) return;

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ embeds: [errorEmbed('Role not found.')], ephemeral: true });
    }

    const member = interaction.member;

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({ embeds: [successEmbed(`Removed **${role.name}** role.`)], ephemeral: true });
      logger.info(`[ReactionRoles] ${member.user.tag} removed role ${role.name}`);
    } else {
      await member.roles.add(roleId);
      await interaction.reply({ embeds: [successEmbed(`Added **${role.name}** role.`)], ephemeral: true });
      logger.info(`[ReactionRoles] ${member.user.tag} added role ${role.name}`);
    }
  } catch (err) {
    logger.error(`[ReactionRoles] Error handling button: ${err.message}`);
    if (!interaction.replied) {
      await interaction.reply({ embeds: [errorEmbed('Failed to update role.')], ephemeral: true }).catch(() => {});
    }
  }
}

/**
 * Handles reaction role dropdown selections.
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleDropdown(interaction) {
  try {
    const panel = await ReactionRole.findOne({ messageId: interaction.message.id });
    if (!panel) return;

    const member = interaction.member;
    const selectedRoles = interaction.values;
    const panelRoleIds = panel.roles.map((r) => r.roleId);

    const added = [];
    const removed = [];

    for (const roleId of panelRoleIds) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;

      if (selectedRoles.includes(roleId) && !member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        added.push(role.name);
      } else if (!selectedRoles.includes(roleId) && member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        removed.push(role.name);
      }
    }

    const parts = [];
    if (added.length) parts.push(`Added: **${added.join(', ')}**`);
    if (removed.length) parts.push(`Removed: **${removed.join(', ')}**`);

    const message = parts.length > 0 ? parts.join('\n') : 'No changes made.';
    await interaction.reply({ embeds: [successEmbed(message)], ephemeral: true });

    logger.info(`[ReactionRoles] ${member.user.tag} updated roles via dropdown`);
  } catch (err) {
    logger.error(`[ReactionRoles] Error handling dropdown: ${err.message}`);
    if (!interaction.replied) {
      await interaction.reply({ embeds: [errorEmbed('Failed to update roles.')], ephemeral: true }).catch(() => {});
    }
  }
}
