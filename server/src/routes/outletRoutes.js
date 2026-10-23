// src/routes/outletRoutes.js
// /api/outlets
// Creating and editing a branch is admin-only. Listing is any logged-in user,
// and the service narrows that list for outlet managers.

const outletService = require('../services/outletService');

const idParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const outletBody = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'branchCode'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 150 },
    branchCode: { type: 'string', minLength: 1, maxLength: 50 },
    address: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
  },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function outletRoutes(fastify) {
  const guard = [fastify.authenticate];
  const admin = [fastify.authenticate, fastify.requireRole('SUPPLIER_ADMIN')];

  fastify.get(
    '/',
    {
      preHandler: guard,
      schema: {
        tags: ['Outlets'],
        summary: 'List outlets visible to the current user',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
    async (request) => outletService.list(request?.user, request?.query)
  );

  fastify.post(
    '/',
    {
      preHandler: admin,
      schema: {
        tags: ['Outlets'],
        summary: 'Create a restaurant branch',
        security: [{ bearerAuth: [] }],
        body: outletBody,
      },
    },
    async (request, reply) => {
      const created = await outletService.create(request?.user, request?.body);
      return reply?.code?.(201)?.send?.({ data: created ?? null });
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: guard,
      schema: {
        tags: ['Outlets'],
        summary: 'Get one outlet',
        security: [{ bearerAuth: [] }],
        params: idParams,
      },
    },
    async (request) => ({
      data: await outletService.getById(request?.user, request?.params?.id),
    })
  );

  fastify.patch(
    '/:id',
    {
      preHandler: admin,
      schema: {
        tags: ['Outlets'],
        summary: 'Update a restaurant branch',
        security: [{ bearerAuth: [] }],
        params: idParams,
        body: {
          ...outletBody,
          required: [],
        },
      },
    },
    async (request) => ({
      data: await outletService.update(request?.user, request?.params?.id, request?.body),
    })
  );
}

module.exports = outletRoutes;
