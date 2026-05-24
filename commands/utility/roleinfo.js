// ─────────────────────────────────────────────────────────────────────────────
// Command: /roleinfo — Shows information about a role
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Shows information about a role')
    .addRoleOption((option) =>
      option.setName('role').setDescription('The role to get info about').setRequired(true)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const role = interaction.options.getRole('role');

    const permissions = role.permissions.toArray();
    const permString = permissions.length > 0
      ? permissions.map((p) => `\`${p}\``).join(', ')
      : 'None';

    // Truncate permissions if too long
    const displayPerms = permString.length > 1024
      ? permString.substring(0, 1000) + '...'
      : permString;

    const embed = createEmbed({
      title: `Role Info — ${role.name}`,
      color: role.color || 0x5865f2,
      fields: [
        { name: 'ID', value: role.id, inline: true },
        { name: 'Color', value: role.hexColor, inline: true },
        { name: 'Members', value: `${role.members.size}`, inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Position', value: `${role.position}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Permissions', value: displayPerms, inline: false },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
