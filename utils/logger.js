const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const LEVELS = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

/**
 * Ensures the logs/ directory exists.
 */
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Returns the current date string in YYYY-MM-DD format.
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a formatted timestamp for log lines.
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Gets the current log file path for today's date.
 * Handles size-based rotation by checking file size and rotating if needed.
 */
function getLogFilePath() {
  const dateStr = getDateString();
  const basePath = path.join(LOGS_DIR, `${dateStr}.log`);

  // If the base file doesn't exist yet, use it
  if (!fs.existsSync(basePath)) {
    return basePath;
  }

  // Check if the base file exceeds max size
  const stats = fs.statSync(basePath);
  if (stats.size < MAX_FILE_SIZE) {
    return basePath;
  }

  // Size-based rotation: find the next available rotated file number
  let rotationIndex = 1;
  while (true) {
    const rotatedPath = path.join(LOGS_DIR, `${dateStr}.${rotationIndex}.log`);
    if (!fs.existsSync(rotatedPath)) {
      // Rename current base file to the rotated name and return base path
      fs.renameSync(basePath, rotatedPath);
      return basePath;
    }
    // If the rotated file exists, check if there's a higher index needed
    rotationIndex++;
  }
}

/**
 * Writes a log entry to the file and optionally to console.
 * @param {string} level - The log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} message - The log message
 */
function writeLog(level, message) {
  ensureLogsDir();

  const timestamp = getTimestamp();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;

  // Write to file
  const filePath = getLogFilePath();
  fs.appendFileSync(filePath, logLine, 'utf8');

  // Log to console in development mode
  if (process.env.NODE_ENV !== 'production') {
    const consoleMethod = level === 'ERROR' ? 'error'
      : level === 'WARN' ? 'warn'
      : level === 'DEBUG' ? 'debug'
      : 'log';
    console[consoleMethod](`[${timestamp}] [${level}] ${message}`);
  }
}

const logger = {
  /**
   * Log an info-level message.
   * @param {string} message
   */
  info(message) {
    writeLog(LEVELS.info, message);
  },

  /**
   * Log a warning-level message.
   * @param {string} message
   */
  warn(message) {
    writeLog(LEVELS.warn, message);
  },

  /**
   * Log an error-level message.
   * @param {string} message
   */
  error(message) {
    writeLog(LEVELS.error, message);
  },

  /**
   * Log a debug-level message.
   * @param {string} message
   */
  debug(message) {
    writeLog(LEVELS.debug, message);
  },
};

module.exports = logger;
