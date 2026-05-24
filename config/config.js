const dotenv = require('dotenv');

dotenv.config();

const requiredKeys = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'MONGO_URI',
  'REDIS_URL',
  'JWT_SECRET',
];

const missing = requiredKeys.filter((key) => !process.env[key] || process.env[key].trim() === '');

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nPlease check your .env file.`
  );
}

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID || null,
  },
  database: {
    mongoUri: process.env.MONGO_URI,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  api: {
    port: parseInt(process.env.API_PORT, 10) || 3000,
    jwtSecret: process.env.JWT_SECRET,
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  virustotal: {
    apiKey: process.env.VIRUSTOTAL_API_KEY || null,
  },
  ai: {
    apiKey: process.env.AI_API_KEY || null,
    provider: process.env.AI_PROVIDER || 'openai',
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY || null,
  },
};

module.exports = config;
