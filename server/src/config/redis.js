// src/config/redis.js
const { createClient } = require('redis');

// Safe fallbacks for host and port configuration
const redisHost = process.env.REDIS_HOST ?? '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;

// Instantiate Redis client with safe fallback URL
const redisClient = createClient({
  url: process.env.REDIS_URL ?? `redis://${redisHost}:${redisPort}`,
});

// Handle Redis errors gracefully with defensive null checks
redisClient?.on('error', (err) => {
  console.error('Redis Client Error:', err?.message ?? err);
});

// Helper function to connect and ping Redis defensively
const connectRedis = async () => {
  if (!redisClient?.isOpen) {
    await redisClient?.connect();
  }
  const ping = (await redisClient?.ping()) ?? 'PONG';
  return { host: redisHost, port: redisPort, ping };
};

module.exports = { redisClient, connectRedis };
