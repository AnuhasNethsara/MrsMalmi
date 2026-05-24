// ─────────────────────────────────────────────────────────────────────────────
// Command: /lockdown — Lock ALL channels in the server
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock ALL text channels in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  permissions: ['Administrator'],
  cooldown: 30,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const channels = interaction.guild.channels.cache.filter(
        (ch) => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement
      );

      let locked = 0;

      for (const [, channel] of channels) {
        try {
          await channel.permissionOverwrites.edit(interaction.guild.id, {
            SendMessages: false,
          });
          locked++;
        } catch {
          // Skip channels we can't edit
        }
      }

      await interaction.editReply({
        embeds: [successEmbed(`🔒 **Server lockdown activated!** Locked ${locked} channel(s). Use \`/unlockall\` to unlock.`)],
      });

      logger.info(`[Lockdown] ${interaction.user.tag} locked ${locked} channels in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Lockdown] Error: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Failed to lock channels.')] });
    }
  },
};
