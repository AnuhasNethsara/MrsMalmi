// ─────────────────────────────────────────────────────────────────────────────
// Database Connection — Mongoose with retry logic and exponential backoff
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const config = require('../config/config');

// Retry configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds cap
const MAX_RETRIES = 10;

// Mongoose connection options
const connectionOptions = {
  serverSelectionTimeoutMS: 10000, // 10s to find a suitable server
  socketTimeoutMS: 45000, // 45s for socket inactivity
};

/**
 * Calculate delay with exponential backoff.
 * Starts at 1s, doubles each retry, caps at 30s.
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(attempt) {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY);
}

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connect to MongoDB with retry logic and exponential backoff.
 * Attaches connection event listeners for monitoring.
 * @returns {Promise<void>}
 * @throws {Error} If all retry attempts are exhausted
 */
async function connectDatabase() {
  // Attach connection event listeners
  mongoose.connection.on('connected', () => {
    console.log('[Database] Mongoose connected to MongoDB.');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] Mongoose disconnected from MongoDB. Attempting reconnection...');
    handleReconnection();
  });

  mongoose.connection.on('error', (err) => {
    console.error('[Database] Mongoose connection error:', err.message);
  });

  // Attempt initial connection with retries
  await attemptConnection();
}

/**
 * Attempt to connect to MongoDB with exponential backoff retries.
 * @returns {Promise<void>}
 * @throws {Error} If max retries exceeded
 */
async function attemptConnection() {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.database.mongoUri, connectionOptions);
      return; // Connection successful
    } catch (error) {
      const delay = getRetryDelay(attempt);
      const remainingRetries = MAX_RETRIES - attempt - 1;

      console.error(
        `[Database] Connection attempt ${attempt + 1}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (remainingRetries === 0) {
        throw new Error(
          `[Database] Failed to connect to MongoDB after ${MAX_RETRIES} attempts. Last error: ${error.message}`
        );
      }

      console.log(
        `[Database] Retrying in ${delay / 1000}s... (${remainingRetries} retries remaining)`
      );
      await sleep(delay);
    }
  }
}

/**
 * Handle automatic reconnection on disconnect.
 * Uses the same exponential backoff strategy.
 */
async function handleReconnection() {
  // Only attempt reconnection if not already connected or connecting
  if (
    mongoose.connection.readyState === 1 || // connected
    mongoose.connection.readyState === 2 // connecting
  ) {
    return;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.database.mongoUri, connectionOptions);
      console.log('[Database] Reconnected to MongoDB successfully.');
      return;
    } catch (error) {
      const delay = getRetryDelay(attempt);
      const remainingRetries = MAX_RETRIES - attempt - 1;

      console.error(
        `[Database] Reconnection attempt ${attempt + 1}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (remainingRetries === 0) {
        console.error(
          `[Database] All reconnection attempts exhausted. Manual intervention required.`
        );
        return;
      }

      console.log(
        `[Database] Retrying reconnection in ${delay / 1000}s... (${remainingRetries} retries remaining)`
      );
      await sleep(delay);
    }
  }
}

module.exports = connectDatabase;
