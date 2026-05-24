// ─────────────────────────────────────────────────────────────────────────────
// Event: guildMemberAdd — Verification system entry point
// ─────────────────────────────────────────────────────────────────────────────

const verification = require('../../services/security/verification');
const Guild = require('../../database/models/Guild');
const { createEmbed } = require('../../utils/embed');
const { COLORS, VERIFICATION } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  /**
   * @param {import('discord.js').GuildMember} member
   * @param {import('discord.js').Client} client
   */
  async execute(member, client) {
    try {
      // Ignore bots
      if (member.user.bot) return;

      // Fetch guild settings
      const guildDoc = await Guild.findOne({ guildId: member.guild.id }).lean();
      const settings = guildDoc?.security?.verification;

      // Check if verification is enabled
      if (!settings || !settings.enabled) return;

      // Check account age
      const minAge = settings.minAccountAge || VERIFICATION.minAccountAge;
      const isOldEnough = verification.checkAccountAge(member, minAge);

      if (!isOldEnough) {
        // Account is too young — DM the member and kick after a short delay
        const minAgeDays = Math.floor(minAge / (24 * 60 * 60 * 1000));

        const embed = createEmbed({
          title: '🚫 Account Too New',
          description: `Your account must be at least **${minAgeDays} days old** to join **${member.guild.name}**.\n\nPlease try again later when your account meets the age requirement.`,
          color: COLORS.error,
        });

        await member.send({ embeds: [embed] }).catch(() => {
          logger.warn(`[Verification] Could not DM ${member.user.tag} about account age`);
        });

        // Kick after a short delay (3 seconds) to allow DM to send
        setTimeout(async () => {
          try {
            if (member.kickable) {
              await member.kick(`[Verification] Account too young (min: ${minAgeDays} days)`);
              logger.info(`[Verification] Kicked ${member.user.tag} — account too young`);
            }
          } catch (err) {
            logger.error(`[Verification] Failed to kick young account ${member.user.tag}: ${err.message}`);
          }
        }, 3000);

        return;
      }

      // Start verification flow
      await verification.startVerification(client, member, settings);

      // Set a timeout to kick if not verified in time
      const timeout = settings.timeout || VERIFICATION.timeout;

      setTimeout(async () => {
        try {
          // Re-fetch member to check if still in guild
          const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
          if (freshMember) {
            await verification.handleTimeout(client, freshMember, settings);
          }
        } catch (err) {
          logger.error(`[Verification] Timeout handler error for ${member.user.tag}: ${err.message}`);
        }
      }, timeout);

    } catch (err) {
      logger.error(`[Verification:guildMemberAdd] Error for ${member.user?.tag}: ${err.message}`);
    }
  },
};
