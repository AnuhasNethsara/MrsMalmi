// ─────────────────────────────────────────────────────────────────────────────
// Command: /unlockall — Unlock ALL channels in the server
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlockall')
    .setDescription('Unlock ALL text channels in the server')
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

      let unlocked = 0;

      for (const [, channel] of channels) {
        try {
          await channel.permissionOverwrites.edit(interaction.guild.id, {
            SendMessages: null,
          });
          unlocked++;
        } catch {
          // Skip channels we can't edit
        }
      }

      await interaction.editReply({
        embeds: [successEmbed(`🔓 **Server unlocked!** Restored ${unlocked} channel(s).`)],
      });

      logger.info(`[Unlockall] ${interaction.user.tag} unlocked ${unlocked} channels in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Unlockall] Error: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Failed to unlock channels.')] });
    }
  },
};
