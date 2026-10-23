// src/routes/categoryRoutes.js
// /api/categories

const categoryService = require('../services/categoryService');

const idParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer' },
  },
};

const categoryBody = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    slug: { type: 'string', minLength: 1, maxLength: 100 },
  },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function categoryRoutes(fastify) {
  const guard = [fastify.authenticate];
  const admin = [fastify.authenticate, fastify.requireRole('SUPPLIER_ADMIN')];

  fastify.get(
    '/',
    {
      preHandler: guard,
      schema: {
        tags: ['Categories'],
        summary: 'List product categories',
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
    async (request) => categoryService.list(request?.query)
  );

  fastify.post(
    '/',
    {
      preHandler: admin,
      schema: {
        tags: ['Categories'],
        summary: 'Create a category',
        security: [{ bearerAuth: [] }],
        body: categoryBody,
      },
    },
    async (request, reply) => {
      const created = await categoryService.create(request?.user, request?.body);
      return reply?.code?.(201)?.send?.({ data: created ?? null });
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: guard,
      schema: {
        tags: ['Categories'],
        summary: 'Get one category',
        security: [{ bearerAuth: [] }],
        params: idParams,
      },
    },
    async (request) => ({
      data: await categoryService.getById(request?.params?.id),
    })
  );

  fastify.patch(
    '/:id',
    {
      preHandler: admin,
      schema: {
        tags: ['Categories'],
        summary: 'Rename a category or change its slug',
        security: [{ bearerAuth: [] }],
        params: idParams,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            slug: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request) => ({
      data: await categoryService.update(request?.user, request?.params?.id, request?.body),
    })
  );

  fastify.delete(
    '/:id',
    {
      preHandler: admin,
      schema: {
        tags: ['Categories'],
        summary: 'Delete a category. Products in it stay, with no category.',
        security: [{ bearerAuth: [] }],
        params: idParams,
      },
    },
    async (request) => ({
      data: await categoryService.remove(request?.user, request?.params?.id),
    })
  );
}

module.exports = categoryRoutes;
