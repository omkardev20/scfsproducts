// src/bootstrap/connections.js
const { connectDB } = require('../config/db');
const { connectRedis } = require('../config/redis');

/**
 * Verifies live connections to Neon PostgreSQL and Redis on startup.
 */
const checkConnections = async () => {
  try {
    const dbInfo = await connectDB();
    const dbName = dbInfo?.db_name ?? 'default';
    console.log(`✅ Connected to Neon PostgreSQL pg (Database: "${dbName}")`);
  } catch (dbErr) {
    console.error(`❌ Neon PostgreSQL Connection Failed miserably: ${dbErr?.message ?? dbErr}`);
  }

  try {
    const redisInfo = await connectRedis();
    const host = redisInfo?.host ?? '127.0.0.1';
    const port = redisInfo?.port ?? 6379;
    const ping = redisInfo?.ping ?? 'PONG';
    console.log(`✅ Connected to Redis (${host}:${port} -> ${ping})`);
  } catch (redisErr) {
    console.error(`❌ Redis Connection Failed: ${redisErr?.message ?? redisErr}`);
  }
};

module.exports = { checkConnections };
