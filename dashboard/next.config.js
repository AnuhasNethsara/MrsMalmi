/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.discordapp.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
  },
};

module.exports = nextConfig;
