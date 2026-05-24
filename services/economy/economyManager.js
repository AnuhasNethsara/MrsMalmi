// ─────────────────────────────────────────────────────────────────────────────
// Service: Economy Manager — Balance, transfer, shop, inventory management
// ─────────────────────────────────────────────────────────────────────────────

const User = require('../../database/models/User');
const Guild = require('../../database/models/Guild');
const logger = require('../../utils/logger');

/**
 * Gets or creates a user document.
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<import('mongoose').Document>}
 */
async function getUser(guildId, userId) {
  let user = await User.findOne({ guildId, userId });
  if (!user) {
    user = await User.create({ guildId, userId });
  }
  return user;
}

/**
 * Gets the coin balance for a user.
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getBalance(guildId, userId) {
  const user = await getUser(guildId, userId);
  return user.coins;
}

/**
 * Adds coins to a user's balance.
 * @param {string} guildId
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<number>} New balance
 */
async function addCoins(guildId, userId, amount) {
  const user = await User.findOneAndUpdate(
    { guildId, userId },
    { $inc: { coins: amount } },
    { new: true, upsert: true }
  );
  return user.coins;
}

/**
 * Removes coins from a user's balance.
 * @param {string} guildId
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<{ success: boolean, balance: number }>}
 */
async function removeCoins(guildId, userId, amount) {
  const user = await getUser(guildId, userId);
  if (user.coins < amount) {
    return { success: false, balance: user.coins };
  }
  user.coins -= amount;
  await user.save();
  return { success: true, balance: user.coins };
}

/**
 * Transfers coins between users.
 * @param {string} guildId
 * @param {string} fromId
 * @param {string} toId
 * @param {number} amount
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function transfer(guildId, fromId, toId, amount) {
  if (fromId === toId) return { success: false, message: 'You cannot pay yourself.' };
  if (amount <= 0) return { success: false, message: 'Amount must be positive.' };

  const sender = await getUser(guildId, fromId);
  if (sender.coins < amount) {
    return { success: false, message: `Insufficient funds. You have **${sender.coins.toLocaleString()}** coins.` };
  }

  await User.updateOne({ guildId, userId: fromId }, { $inc: { coins: -amount } });
  await User.findOneAndUpdate({ guildId, userId: toId }, { $inc: { coins: amount } }, { upsert: true });

  logger.info(`[Economy] Transfer: ${fromId} -> ${toId} (${amount} coins) in guild ${guildId}`);
  return { success: true };
}

/**
 * Gets the shop items for a guild.
 * @param {string} guildId
 * @returns {Promise<Array>}
 */
async function getShopItems(guildId) {
  const guild = await Guild.findOne({ guildId }).lean();
  return guild?.economy?.shopItems || [];
}

/**
 * Gets a user's inventory.
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getInventory(guildId, userId) {
  const user = await getUser(guildId, userId);
  return user.inventory || [];
}

/**
 * Purchases an item from the shop.
 * @param {string} guildId
 * @param {string} userId
 * @param {string} itemName
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function buyItem(guildId, userId, itemName) {
  const shopItems = await getShopItems(guildId);
  const item = shopItems.find((i) => i.name.toLowerCase() === itemName.toLowerCase());

  if (!item) return { success: false, message: 'Item not found in the shop.' };

  const user = await getUser(guildId, userId);
  if (user.coins < item.price) {
    return { success: false, message: `You need **${item.price.toLocaleString()}** coins but only have **${user.coins.toLocaleString()}**.` };
  }

  await User.updateOne(
    { guildId, userId },
    {
      $inc: { coins: -item.price },
      $push: { inventory: { name: item.name, purchasedAt: new Date() } },
    }
  );

  logger.info(`[Economy] ${userId} purchased "${item.name}" for ${item.price} coins in guild ${guildId}`);
  return { success: true, message: `You purchased **${item.name}** for **${item.price.toLocaleString()}** coins!` };
}

module.exports = {
  getUser,
  getBalance,
  addCoins,
  removeCoins,
  transfer,
  getShopItems,
  getInventory,
  buyItem,
};
