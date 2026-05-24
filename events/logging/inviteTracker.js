// ─────────────────────────────────────────────────────────────────────────────
// Event: Invite Tracker — Tracks which invite was used when a member joins
// Listens to guildMemberAdd, inviteCreate, inviteDelete, and ready events
// ─────────────────────────────────────────────────────────────────────────────

const { Collection } = require('discord.js');
const { logEvent } = require('../../services/logging/logger');
const logger = require('../../utils/logger');

// Cache of guild invites: Map<guildId, Map<code, uses>>
const inviteCache = new Collection();

/**
 * Caches all invites for a guild.
 * @param {import('discord.js').Guild} guild
 */
async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const guildInvites = new Collection();

    invites.forEach(invite => {
      guildInvites.set(invite.code, {
        uses: invite.uses,
        inviterId: invite.inviter?.id || 'Unknown',
        inviterTag: invite.inviter?.tag || 'Unknown',
      });
    });

    inviteCache.set(guild.id, guildInvites);
  } catch (err) {
    // Bot may not have MANAGE_GUILD permission
    logger.debug(`[InviteTracker] Could not cache invites for ${guild.name}: ${err.message}`);
  }
}

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  /**
   * Initializes the invite cache. Should be called when the client is ready.
   * @param {import('discord.js').Client} client
   */
  async init(client) {
    // Cache invites for all guilds on startup
    for (const [, guild] of client.guilds.cache) {
      await cacheGuildInvites(guild);
    }
    logger.info(`[InviteTracker] Cached invites for ${client.guilds.cache.size} guild(s).`);

    // Listen for invite create/delete to keep cache updated
    client.on('inviteCreate', (invite) => {
      if (!invite.guild) return;
      const guildInvites = inviteCache.get(invite.guild.id) || new Collection();
      guildInvites.set(invite.code, {
        uses: invite.uses,
        inviterId: invite.inviter?.id || 'Unknown',
        inviterTag: invite.inviter?.tag || 'Unknown',
      });
      inviteCache.set(invite.guild.id, guildInvites);
    });

    client.on('inviteDelete', (invite) => {
      if (!invite.guild) return;
      const guildInvites = inviteCache.get(invite.guild.id);
      if (guildInvites) {
        guildInvites.delete(invite.code);
      }
    });
  },

  /**
   * @param {import('discord.js').GuildMember} member
   * @param {import('discord.js').Client} client
   */
  async execute(member, client) {
    try {
      const { guild } = member;

      // Initialize cache if not done yet (first run)
      if (!inviteCache.has(guild.id)) {
        await cacheGuildInvites(guild);
      }

      const cachedInvites = inviteCache.get(guild.id);
      if (!cachedInvites) return;

      // Fetch current invites
      let currentInvites;
      try {
        currentInvites = await guild.invites.fetch();
      } catch {
        return; // No permission to fetch invites
      }

      // Find the invite that was used (uses increased by 1)
      let usedInvite = null;

      for (const [code, invite] of currentInvites) {
        const cached = cachedInvites.get(code);
        if (cached && invite.uses > cached.uses) {
          usedInvite = {
            code,
            inviterId: invite.inviter?.id || 'Unknown',
            inviterTag: invite.inviter?.tag || 'Unknown',
          };
          break;
        }
      }

      // Check for new invites not in cache (vanity URL or new invite)
      if (!usedInvite) {
        for (const [code, invite] of currentInvites) {
          if (!cachedInvites.has(code) && invite.uses > 0) {
            usedInvite = {
              code,
              inviterId: invite.inviter?.id || 'Unknown',
              inviterTag: invite.inviter?.tag || 'Unknown',
            };
            break;
          }
        }
      }

      // Update the cache with current invites
      const updatedCache = new Collection();
      currentInvites.forEach(invite => {
        updatedCache.set(invite.code, {
          uses: invite.uses,
          inviterId: invite.inviter?.id || 'Unknown',
          inviterTag: invite.inviter?.tag || 'Unknown',
        });
      });
      inviteCache.set(guild.id, updatedCache);

      // Log the invite usage
      if (usedInvite) {
        const fields = [
          { name: 'Invite Code', value: usedInvite.code, inline: true },
          { name: 'Invited By', value: `${usedInvite.inviterTag} (${usedInvite.inviterId})`, inline: true },
        ];

        await logEvent(client, guild.id, 'members', {
          action: 'Invite Used',
          target: `${member.user.tag} (${member.user.id})`,
          fields,
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        });
      }
    } catch (err) {
      logger.error(`[InviteTracker] Error: ${err.message}`);
    }
  },

  // Export for external initialization
  cacheGuildInvites,
  inviteCache,
};
