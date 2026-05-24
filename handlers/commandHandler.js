// ─────────────────────────────────────────────────────────────────────────────
// Command Handler — Recursively discovers and registers slash commands
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

/**
 * Recursively reads all .js files from a directory and its subdirectories.
 * @param {string} dir - The directory to scan.
 * @returns {string[]} Array of absolute file paths.
 */
function getCommandFiles(dir) {
  const files = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getCommandFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== '.gitkeep') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Loads all command files into client.commands and logs results.
 * @param {import('discord.js').Client} client
 */
function commandHandler(client) {
  if (!client.commands) {
    client.commands = new Collection();
  }

  const commandsDir = path.join(__dirname, '..', 'commands');

  if (!fs.existsSync(commandsDir)) {
    console.warn('[Commands] commands/ directory not found. Skipping command loading.');
    return;
  }

  const commandFiles = getCommandFiles(commandsDir);
  const categories = {};
  let loaded = 0;
  let skipped = 0;

  for (const filePath of commandFiles) {
    try {
      const command = require(filePath);

      // Determine category from the subdirectory name
      const relativePath = path.relative(commandsDir, filePath);
      const category = path.dirname(relativePath).split(path.sep)[0] || 'uncategorized';

      // Validate command structure
      if (!command.data) {
        console.warn(`[Commands] Skipping ${relativePath}: missing "data" property (SlashCommandBuilder).`);
        skipped++;
        continue;
      }

      if (typeof command.execute !== 'function') {
        console.warn(`[Commands] Skipping ${relativePath}: missing "execute" function.`);
        skipped++;
        continue;
      }

      // Register the command
      client.commands.set(command.data.name, command);

      // Track category counts
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
      loaded++;
    } catch (error) {
      const relativePath = path.relative(commandsDir, filePath);
      console.error(`[Commands] Error loading ${relativePath}:`, error.message);
      skipped++;
    }
  }

  // Log summary
  console.log(`[Commands] Loaded ${loaded} command(s).`);

  if (skipped > 0) {
    console.log(`[Commands] Skipped ${skipped} invalid file(s).`);
  }

  // Log per-category breakdown
  const categoryEntries = Object.entries(categories);
  if (categoryEntries.length > 0) {
    const breakdown = categoryEntries
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ');
    console.log(`[Commands] Categories — ${breakdown}`);
  }
}

module.exports = commandHandler;
