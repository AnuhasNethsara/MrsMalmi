// ─────────────────────────────────────────────────────────────────────────────
// Command: /userinfo — Shows information about a user
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Shows information about a user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to get info about (defaults to you)').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id)
      || await interaction.guild.members.fetch(user.id).catch(() => null);

    const fields = [
      { name: 'Username', value: user.tag, inline: true },
      { name: 'ID', value: user.id, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
    ];

    if (member) {
      fields.push(
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Roles', value: member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => r.toString()).join(', ') || 'None', inline: false },
        { name: 'Key Permissions', value: getKeyPermissions(member) || 'None', inline: false }
      );
    }

    const embed = createEmbed({
      title: `User Info — ${user.tag}`,
      thumbnail: user.displayAvatarURL({ dynamic: true, size: 512 }),
      color: COLORS.info,
      fields,
    });

    await interaction.reply({ embeds: [embed] });
  },
};

/**
 * Returns a formatted string of key permissions for a member.
 * @param {import('discord.js').GuildMember} member
 * @returns {string}
 */
function getKeyPermissions(member) {
  const keyPerms = [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'ManageMessages',
    'KickMembers',
    'BanMembers',
    'MentionEveryone',
    'ManageWebhooks',
  ];

  const permissions = member.permissions;
  const has = keyPerms.filter((perm) => permissions.has(PermissionsBitField.Flags[perm]));

  return has.map((p) => `\`${p}\``).join(', ');
}
