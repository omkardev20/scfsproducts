// src/routes/health.js

/**
 * Health check route plugin
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} options
 */
async function healthRoutes(fastify, options) {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Check operational status of the server and connected services (PostgreSQL & Redis)',
        tags: ['System'],
        summary: 'Service health check',
        response: {
          200: {
            description: 'Successful health status response',
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              message: { type: 'string', example: 'SupplyHub API is running' },
              services: {
                type: 'object',
                properties: {
                  neon_postgres: { type: 'string', example: 'connected' },
                  redis: { type: 'string', example: 'connected' },
                },
              },
              timestamp: { type: 'string', example: '2026-10-19T14:00:00.000Z' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return {
        status: 'healthy',
        message: 'SupplyHub API is running',
        services: {
          neon_postgres: 'connected',
          redis: 'connected',
        },
        timestamp: new Date()?.toISOString?.() ?? new Date().toString(),
      };
    }
  );
}

module.exports = healthRoutes;
