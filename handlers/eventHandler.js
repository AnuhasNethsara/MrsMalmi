// ─────────────────────────────────────────────────────────────────────────────
// Event Handler — Recursively discovers and attaches event listeners
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

/**
 * Recursively reads all .js files from a directory and its subdirectories.
 * Skips .gitkeep files.
 * @param {string} dir - The directory to scan.
 * @returns {string[]} Array of absolute file paths.
 */
function getEventFiles(dir) {
  const files = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getEventFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== '.gitkeep') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Loads all event files and attaches listeners to the client.
 * Each event file should export: { name: string, once: boolean, execute: async function }
 * The execute function receives Discord.js event args + client as the last argument.
 * @param {import('discord.js').Client} client
 */
function eventHandler(client) {
  const eventsDir = path.join(__dirname, '..', 'events');

  if (!fs.existsSync(eventsDir)) {
    console.warn('[Events] events/ directory not found. Skipping event loading.');
    return;
  }

  const eventFiles = getEventFiles(eventsDir);
  const categories = {};
  let loaded = 0;
  let skipped = 0;

  for (const filePath of eventFiles) {
    try {
      const event = require(filePath);

      // Determine category from the subdirectory name
      const relativePath = path.relative(eventsDir, filePath);
      const dirName = path.dirname(relativePath).split(path.sep)[0];
      const category = (dirName === '.' || dirName === '') ? 'root' : dirName;

      // Validate event structure
      if (!event.name || typeof event.name !== 'string') {
        console.warn(`[Events] Skipping ${relativePath}: missing or invalid "name" property.`);
        skipped++;
        continue;
      }

      if (typeof event.execute !== 'function') {
        console.warn(`[Events] Skipping ${relativePath}: missing "execute" function.`);
        skipped++;
        continue;
      }

      // Attach the event listener
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      // Track category counts
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
      loaded++;
    } catch (error) {
      const relativePath = path.relative(eventsDir, filePath);
      console.error(`[Events] Error loading ${relativePath}:`, error.message);
      skipped++;
    }
  }

  // Log summary
  console.log(`[Events] Loaded ${loaded} event(s).`);

  if (skipped > 0) {
    console.log(`[Events] Skipped ${skipped} invalid file(s).`);
  }

  // Log per-category breakdown
  const categoryEntries = Object.entries(categories);
  if (categoryEntries.length > 0) {
    const breakdown = categoryEntries
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ');
    console.log(`[Events] Categories — ${breakdown}`);
  }
}

module.exports = eventHandler;
