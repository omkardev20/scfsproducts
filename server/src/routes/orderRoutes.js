// src/routes/orderRoutes.js
// /api/orders
// The body carries product ids and quantities only. Prices are filled in by the server.

const orderService = require('../services/orderService');

const idParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function orderRoutes(fastify) {
  const guard = [fastify.authenticate];

  fastify.get(
    '/',
    {
      preHandler: guard,
      schema: {
        tags: ['Orders'],
        summary: 'List orders. Managers see only their outlet. Items are not included.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'],
            },
            outletId: { type: 'string' },
          },
        },
      },
    },
    async (request) => orderService.list(request?.user, request?.query)
  );

  fastify.post(
    '/',
    {
      preHandler: guard,
      schema: {
        tags: ['Orders'],
        summary: 'Place an order. Stock is reserved immediately.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['items'],
          properties: {
            outletId: { type: 'string' },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['productId', 'quantity'],
                properties: {
                  productId: { type: 'string', minLength: 1 },
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const created = await orderService.create(request?.user, request?.body);
      return reply?.code?.(201)?.send?.({ data: created ?? null });
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: guard,
      schema: {
        tags: ['Orders'],
        summary: 'Get one order, including line items',
        security: [{ bearerAuth: [] }],
        params: idParams,
      },
    },
    async (request) => ({
      data: await orderService.getById(request?.user, request?.params?.id),
    })
  );

  fastify.patch(
    '/:id/status',
    {
      preHandler: guard,
      schema: {
        tags: ['Orders'],
        summary: 'Move an order forward, or cancel it before it ships',
        security: [{ bearerAuth: [] }],
        params: idParams,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'],
            },
          },
        },
      },
    },
    async (request) => ({
      data: await orderService.changeStatus(
        request?.user,
        request?.params?.id,
        request?.body?.status
      ),
    })
  );
}

module.exports = orderRoutes;
