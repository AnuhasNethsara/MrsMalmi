// ─────────────────────────────────────────────────────────────────────────────
// Event: guildMemberAdd — Welcome system entry point
// ─────────────────────────────────────────────────────────────────────────────

const Guild = require('../../database/models/Guild');
const { sendWelcome } = require('../../services/welcome/welcomeManager');
const { generateWelcomeCard } = require('../../services/welcome/welcomeCard');
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
      const settings = guildDoc?.welcome;

      // Check if welcome system is enabled
      if (!settings || !settings.enabled) return;

      // Generate welcome card if enabled
      let cardBuffer = null;
      if (settings.cardEnabled) {
        cardBuffer = await generateWelcomeCard(member, member.guild);
      }

      // Send welcome message
      await sendWelcome(member.guild, member, settings, cardBuffer);

      // Assign auto-roles
      if (settings.autoRoles && settings.autoRoles.length > 0) {
        await assignAutoRoles(member, settings.autoRoles);
      }

      logger.info(`[Welcome] Processed welcome for ${member.user.tag} in guild ${member.guild.id}`);
    } catch (err) {
      logger.error(`[Welcome:guildMemberAdd] Error for ${member.user?.tag}: ${err.message}`);
    }
  },
};

/**
 * Assigns configured auto-roles to a new member.
 * @param {import('discord.js').GuildMember} member - The new member
 * @param {string[]} roleIds - Array of role IDs to assign
 */
async function assignAutoRoles(member, roleIds) {
  for (const roleId of roleIds) {
    try {
      const role = member.guild.roles.cache.get(roleId);
      if (role && role.editable) {
        await member.roles.add(role, '[Welcome] Auto-role assignment');
      } else {
        logger.warn(`[Welcome] Auto-role ${roleId} not found or not editable in guild ${member.guild.id}`);
      }
    } catch (err) {
      logger.error(`[Welcome] Failed to assign auto-role ${roleId} to ${member.user.tag}: ${err.message}`);
    }
  }
}
