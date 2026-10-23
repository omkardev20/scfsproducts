// src/routes/health.js
// Public probe. No login token. It really asks PostgreSQL and Redis,
// so a broken connection shows up as 503 instead of a fake "healthy".

const { pool } = require('../config/db');
const { redisClient } = require('../config/redis');

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function healthRoutes(fastify) {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Check PostgreSQL and Redis. No login token is required.',
        tags: ['System'],
        summary: 'Service health check',
      },
    },
    async (request, reply) => {
      let postgres = 'disconnected';
      let redis = 'disconnected';

      try {
        // SELECT 1 only proves the pool can run a query. It does not read business tables.
        await pool?.query?.('SELECT 1');
        postgres = 'connected';
      } catch (error) {
        console.error('❌ Health check postgres failed:', error?.message ?? error);
      }

      try {
        const ping = await redisClient?.ping?.();
        redis = ping ? 'connected' : 'disconnected';
      } catch (error) {
        console.error('❌ Health check redis failed:', error?.message ?? error);
      }

      const healthy = postgres === 'connected' && redis === 'connected';

      return reply?.code?.(healthy ? 200 : 503)?.send?.({
        status: healthy ? 'healthy' : 'degraded',
        message: healthy ? 'SupplyHub API is running' : 'One or more services are unreachable',
        services: {
          postgres,
          redis,
        },
        timestamp: new Date()?.toISOString?.() ?? null,
      });
    }
  );
}

module.exports = healthRoutes;
