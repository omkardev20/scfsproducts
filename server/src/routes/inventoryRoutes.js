// src/routes/inventoryRoutes.js
// /api/inventory
// Admin only. Positive changeQuantity adds stock. Negative removes it.

const inventoryService = require('../services/inventoryService');

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function inventoryRoutes(fastify) {
  const admin = [fastify.authenticate, fastify.requireRole('SUPPLIER_ADMIN')];

  fastify.get(
    '/logs',
    {
      preHandler: admin,
      schema: {
        tags: ['Inventory'],
        summary: 'List stock changes, newest first',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
            productId: { type: 'string' },
          },
        },
      },
    },
    async (request) => inventoryService.list(request?.user, request?.query)
  );

  fastify.post(
    '/adjust',
    {
      preHandler: admin,
      schema: {
        tags: ['Inventory'],
        summary: 'Add or remove stock and write an audit row',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['productId', 'changeQuantity', 'reason'],
          properties: {
            productId: { type: 'string', minLength: 1 },
            changeQuantity: { type: 'integer' },
            reason: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const created = await inventoryService.adjust(request?.user, request?.body);
      return reply?.code?.(201)?.send?.({ data: created ?? null });
    }
  );
}

module.exports = inventoryRoutes;
