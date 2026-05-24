// ─────────────────────────────────────────────────────────────────────────────
// Deploy Commands — Registers slash commands with the Discord API
// Run standalone: npm run deploy-commands
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('../config/config');

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

async function deployCommands() {
  const commandsDir = path.join(__dirname, '..', 'commands');

  if (!fs.existsSync(commandsDir)) {
    console.error('[Deploy] commands/ directory not found.');
    process.exit(1);
  }

  const commandFiles = getCommandFiles(commandsDir);
  const commands = [];
  let skipped = 0;

  for (const filePath of commandFiles) {
    try {
      const command = require(filePath);
      const relativePath = path.relative(commandsDir, filePath);

      if (!command.data) {
        console.warn(`[Deploy] Skipping ${relativePath}: missing "data" property.`);
        skipped++;
        continue;
      }

      if (typeof command.execute !== 'function') {
        console.warn(`[Deploy] Skipping ${relativePath}: missing "execute" function.`);
        skipped++;
        continue;
      }

      commands.push(command.data.toJSON());
    } catch (error) {
      const relativePath = path.relative(commandsDir, filePath);
      console.error(`[Deploy] Error loading ${relativePath}:`, error.message);
      skipped++;
    }
  }

  if (commands.length === 0) {
    console.log('[Deploy] No commands found to register.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log(`[Deploy] Registering ${commands.length} slash command(s)...`);

    if (config.discord.guildId) {
      // Guild-specific deployment (instant, good for development)
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      console.log(`[Deploy] Successfully registered ${commands.length} command(s) to guild ${config.discord.guildId}.`);
    } else {
      // Global deployment (can take up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      console.log(`[Deploy] Successfully registered ${commands.length} command(s) globally.`);
    }

    if (skipped > 0) {
      console.log(`[Deploy] Skipped ${skipped} invalid file(s).`);
    }
  } catch (error) {
    console.error('[Deploy] Failed to register commands:', error);
    process.exit(1);
  }
}

// Run if executed directly (npm run deploy-commands)
deployCommands();
