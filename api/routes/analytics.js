// ─────────────────────────────────────────────────────────────────────────────
// Analytics Routes — Guild statistics and growth data
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const Punishment = require('../../database/models/Punishment');
const { authenticate } = require('../middleware/auth');
const { checkGuildPermission } = require('../middleware/permissions');

const router = Router();

// All routes require authentication and guild permission
router.use('/:guildId/analytics', authenticate, checkGuildPermission);

// ── GET /api/guilds/:guildId/analytics — Returns analytics data ───────────────
router.get('/:guildId/analytics', async (req, res) => {
  try {
    const { guildId } = req.params;
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const client = req.app.get('discordClient');
    const guild = client ? client.guilds.cache.get(guildId) : null;

    // ── Join growth data ────────────────────────────────────────────────────
    let joinGrowth = null;
    if (guild) {
      const members = await guild.members.fetch().catch(() => null);
      if (members) {
        // Group joins by day
        const joinsByDay = {};
        members.forEach((member) => {
          if (member.joinedAt && member.joinedAt >= since) {
            const day = member.joinedAt.toISOString().split('T')[0];
            joinsByDay[day] = (joinsByDay[day] || 0) + 1;
          }
        });
        joinGrowth = {
          totalMembers: guild.memberCount,
          recentJoins: Object.entries(joinsByDay)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        };
      }
    }

    // ── Message activity (from Redis if available) ──────────────────────────
    let messageActivity = null;
    if (client && client.redis) {
      try {
        const activityData = await client.redis.get(`analytics:messages:${guildId}`);
        if (activityData) {
          messageActivity = JSON.parse(activityData);
        }
      } catch (e) {
        // Redis data not available, skip
      }
    }

    // ── Moderation stats ────────────────────────────────────────────────────
    const moderationStats = await Punishment.aggregate([
      { $match: { guildId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalCases = await Punishment.countDocuments({ guildId, createdAt: { $gte: since } });

    res.json({
      period: { days, since: since.toISOString() },
      joinGrowth,
      messageActivity,
      moderation: {
        totalCases,
        byAction: moderationStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('[Analytics] Error fetching analytics:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

module.exports = router;
