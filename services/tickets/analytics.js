// ─────────────────────────────────────────────────────────────────────────────
// Ticket Analytics — Provides ticket statistics and metrics
// ─────────────────────────────────────────────────────────────────────────────

const Ticket = require('../../database/models/Ticket');
const logger = require('../../utils/logger');

/**
 * Returns ticket analytics for a guild.
 * Includes total tickets, open tickets, average resolution time, and per-category breakdown.
 * @param {string} guildId - The guild ID to get analytics for
 * @returns {Promise<Object>} Analytics object
 */
async function getTicketAnalytics(guildId) {
  try {
    const [totalTickets, openTickets, categoryBreakdown, avgResolution] = await Promise.all([
      Ticket.countDocuments({ guildId }),
      Ticket.countDocuments({ guildId, status: { $in: ['open', 'claimed'] } }),
      getCategoryBreakdown(guildId),
      getAverageResolutionTime(guildId),
    ]);

    return {
      totalTickets,
      openTickets,
      closedTickets: totalTickets - openTickets,
      avgResolutionTime: avgResolution,
      categoryBreakdown,
    };
  } catch (err) {
    logger.error(`[TicketAnalytics] Error fetching analytics for guild ${guildId}: ${err.message}`);
    return {
      totalTickets: 0,
      openTickets: 0,
      closedTickets: 0,
      avgResolutionTime: null,
      categoryBreakdown: [],
    };
  }
}

/**
 * Calculates the average resolution time for closed tickets.
 * @param {string} guildId - The guild ID
 * @returns {Promise<number|null>} Average resolution time in milliseconds, or null if no closed tickets
 */
async function getAverageResolutionTime(guildId) {
  const result = await Ticket.aggregate([
    { $match: { guildId, status: 'closed', closedAt: { $exists: true } } },
    {
      $project: {
        resolutionTime: { $subtract: ['$closedAt', '$createdAt'] },
      },
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$resolutionTime' },
      },
    },
  ]);

  return result.length > 0 ? Math.round(result[0].avgTime) : null;
}

/**
 * Gets ticket count breakdown by category/type.
 * @param {string} guildId - The guild ID
 * @returns {Promise<Array<{type: string, total: number, open: number, closed: number}>>}
 */
async function getCategoryBreakdown(guildId) {
  const result = await Ticket.aggregate([
    { $match: { guildId } },
    {
      $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Transform aggregation result into a structured breakdown
  const categories = {};

  for (const entry of result) {
    const type = entry._id.type;
    const status = entry._id.status;

    if (!categories[type]) {
      categories[type] = { type, total: 0, open: 0, closed: 0 };
    }

    categories[type].total += entry.count;

    if (status === 'closed') {
      categories[type].closed += entry.count;
    } else {
      categories[type].open += entry.count;
    }
  }

  return Object.values(categories);
}

module.exports = { getTicketAnalytics };
