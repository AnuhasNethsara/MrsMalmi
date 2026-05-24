// ─────────────────────────────────────────────────────────────────────────────
// Service: Reaction Role Manager — Panel creation, role assignment handling
// ─────────────────────────────────────────────────────────────────────────────

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const ReactionRole = require('../../database/models/ReactionRole');
const logger = require('../../utils/logger');

/**
 * Creates a reaction role panel message.
 * @param {import('discord.js').TextChannel} channel - Target channel
 * @param {string} type - Panel type ('button' or 'dropdown')
 * @param {Array<{ roleId: string, emoji: string, label: string, description?: string }>} roles
 * @returns {Promise<import('mongoose').Document>}
 */
async function createPanel(channel, type, roles) {
  let components;

  if (type === 'button') {
    const rows = [];
    for (let i = 0; i < roles.length; i += 5) {
      const row = new ActionRowBuilder();
      const chunk = roles.slice(i, i + 5);
      for (const role of chunk) {
        const btn = new ButtonBuilder()
          .setCustomId(`rr_${role.roleId}`)
          .setLabel(role.label)
          .setStyle(ButtonStyle.Primary);
        if (role.emoji) btn.setEmoji(role.emoji);
        row.addComponents(btn);
      }
      rows.push(row);
    }
    components = rows;
  } else {
    const options = roles.map((role) => ({
      label: role.label,
      value: role.roleId,
      description: role.description || undefined,
      emoji: role.emoji || undefined,
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rr_dropdown')
        .setPlaceholder('Select a role...')
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(options),
    );
    components = [row];
  }

  const message = await channel.send({
    content: '**Role Selection**\nChoose your roles below:',
    components,
  });

  const panel = await ReactionRole.create({
    guildId: channel.guild.id,
    channelId: channel.id,
    messageId: message.id,
    type,
    roles,
  });

  logger.info(`[ReactionRoles] Created ${type} panel in ${channel.guild.id}#${channel.name} with ${roles.length} roles`);
  return panel;
}

/**
 * Adds a role to an existing panel.
 * @param {string} guildId
 * @param {string} messageId
 * @param {{ roleId: string, emoji: string, label: string, description?: string }} roleData
 * @param {import('discord.js').Client} client
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function addRole(guildId, messageId, roleData, client) {
  const panel = await ReactionRole.findOne({ guildId, messageId });
  if (!panel) return { success: false, message: 'Panel not found.' };

  if (panel.roles.some((r) => r.roleId === roleData.roleId)) {
    return { success: false, message: 'Role already exists on this panel.' };
  }

  panel.roles.push(roleData);
  await panel.save();

  // Update the message components
  await updatePanelMessage(panel, client);

  logger.info(`[ReactionRoles] Added role ${roleData.roleId} to panel ${messageId} in ${guildId}`);
  return { success: true };
}

/**
 * Removes a role from an existing panel.
 * @param {string} guildId
 * @param {string} messageId
 * @param {string} roleId
 * @param {import('discord.js').Client} client
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function removeRole(guildId, messageId, roleId, client) {
  const panel = await ReactionRole.findOne({ guildId, messageId });
  if (!panel) return { success: false, message: 'Panel not found.' };

  const index = panel.roles.findIndex((r) => r.roleId === roleId);
  if (index === -1) return { success: false, message: 'Role not found on this panel.' };

  panel.roles.splice(index, 1);
  await panel.save();

  await updatePanelMessage(panel, client);

  logger.info(`[ReactionRoles] Removed role ${roleId} from panel ${messageId} in ${guildId}`);
  return { success: true };
}

/**
 * Updates the panel message with current roles.
 * @param {import('mongoose').Document} panel
 * @param {import('discord.js').Client} client
 */
async function updatePanelMessage(panel, client) {
  try {
    const channel = await client.channels.fetch(panel.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(panel.messageId).catch(() => null);
    if (!message) return;

    let components;

    if (panel.type === 'button') {
      const rows = [];
      for (let i = 0; i < panel.roles.length; i += 5) {
        const row = new ActionRowBuilder();
        const chunk = panel.roles.slice(i, i + 5);
        for (const role of chunk) {
          const btn = new ButtonBuilder()
            .setCustomId(`rr_${role.roleId}`)
            .setLabel(role.label)
            .setStyle(ButtonStyle.Primary);
          if (role.emoji) btn.setEmoji(role.emoji);
          row.addComponents(btn);
        }
        rows.push(row);
      }
      components = rows;
    } else {
      if (panel.roles.length === 0) {
        components = [];
      } else {
        const options = panel.roles.map((role) => ({
          label: role.label,
          value: role.roleId,
          description: role.description || undefined,
          emoji: role.emoji || undefined,
        }));

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rr_dropdown')
            .setPlaceholder('Select a role...')
            .setMinValues(0)
            .setMaxValues(options.length)
            .addOptions(options),
        );
        components = [row];
      }
    }

    await message.edit({ components });
  } catch (err) {
    logger.error(`[ReactionRoles] Error updating panel message: ${err.message}`);
  }
}

module.exports = {
  createPanel,
  addRole,
  removeRole,
};
