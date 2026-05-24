// ─────────────────────────────────────────────────────────────────────────────
// Guild Permission Check Middleware
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

/**
 * Verifies that the authenticated user has access to the guild specified
 * in req.params.guildId. Checks the user's guilds from Discord API or
 * uses cached guild data from the user's JWT payload.
 */
function checkGuildPermission(req, res, next) {
  try {
    const { guildId } = req.params;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID is required' });
    }

    // Check if user has guilds cached in their JWT payload
    if (req.user.guilds && Array.isArray(req.user.guilds)) {
      const userGuild = req.user.guilds.find((g) => g.id === guildId);

      if (!userGuild) {
        return res.status(403).json({ error: 'You do not have access to this guild' });
      }

      // Check if user has MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8) permission
      const permissions = parseInt(userGuild.permissions, 10);
      const hasManageGuild = (permissions & 0x20) === 0x20;
      const hasAdmin = (permissions & 0x8) === 0x8;

      if (!hasManageGuild && !hasAdmin) {
        return res.status(403).json({ error: 'Insufficient permissions for this guild' });
      }

      req.guild = userGuild;
      return next();
    }

    // If no cached guilds, deny access
    return res.status(403).json({ error: 'Unable to verify guild access' });
  } catch (error) {
    console.error('[Permissions] Error checking guild access:', error.message);
    return res.status(500).json({ error: 'Failed to verify permissions' });
  }
}

module.exports = { checkGuildPermission };
