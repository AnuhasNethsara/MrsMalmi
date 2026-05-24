// ─────────────────────────────────────────────────────────────────────────────
// Command: /weather — Shows weather information for a city
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config/config');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Shows weather information for a city')
    .addStringOption((option) =>
      option.setName('city').setDescription('The city to get weather for').setRequired(true)
    ),

  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const city = interaction.options.getString('city');

    if (!config.weather.apiKey) {
      return interaction.reply({
        embeds: [errorEmbed('Weather service is not configured. Please contact the bot administrator.')],
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: city,
          appid: config.weather.apiKey,
          units: 'metric',
        },
        timeout: 10000,
      });

      const data = response.data;
      const weather = data.weather[0];
      const iconURL = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;

      const embed = createEmbed({
        title: `🌤️ Weather in ${data.name}, ${data.sys.country}`,
        thumbnail: iconURL,
        color: COLORS.info,
        fields: [
          { name: 'Condition', value: weather.description.charAt(0).toUpperCase() + weather.description.slice(1), inline: true },
          { name: 'Temperature', value: `${data.main.temp}°C`, inline: true },
          { name: 'Feels Like', value: `${data.main.feels_like}°C`, inline: true },
          { name: 'Humidity', value: `${data.main.humidity}%`, inline: true },
          { name: 'Wind Speed', value: `${data.wind.speed} m/s`, inline: true },
          { name: 'Pressure', value: `${data.main.pressure} hPa`, inline: true },
        ],
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        await interaction.editReply({
          embeds: [errorEmbed(`City "${city}" not found. Please check the spelling and try again.`)],
        });
      } else {
        await interaction.editReply({
          embeds: [errorEmbed('Unable to fetch weather data. The service may be temporarily unavailable.')],
        });
      }
    }
  },
};
