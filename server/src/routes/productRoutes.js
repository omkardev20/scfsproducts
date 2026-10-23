// src/routes/productRoutes.js
// /api/products
// Stock is not accepted on PATCH. Use the inventory route so every change is logged.

const productService = require('../services/productService');

const idParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const productBody = {
  type: 'object',
  additionalProperties: false,
  required: ['sku', 'name', 'price'],
  properties: {
    categoryId: { type: ['integer', 'null'] },
    sku: { type: 'string', minLength: 1, maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: ['string', 'null'] },
    price: { type: 'number', minimum: 0 },
    currentStock: { type: 'integer', minimum: 0 },
    unit: { type: 'string', minLength: 1, maxLength: 50 },
    isActive: { type: 'boolean' },
  },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function productRoutes(fastify) {
  const guard = [fastify.authenticate];
  const admin = [fastify.authenticate, fastify.requireRole('SUPPLIER_ADMIN')];

  fastify.get(
    '/',
    {
      preHandler: guard,
      schema: {
        tags: ['Products'],
        summary: 'List products. The default page is cached for 60 seconds.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
            search: { type: 'string' },
            includeInactive: { type: 'boolean' },
          },
        },
      },
    },
    async (request) => productService.list(request?.user, request?.query)
  );

  fastify.post(
    '/',
    {
      preHandler: admin,
      schema: {
        tags: ['Products'],
        summary: 'Create a product. Opening stock is written to the inventory log.',
        security: [{ bearerAuth: [] }],
        body: productBody,
      },
    },
    async (request, reply) => {
      const created = await productService.create(request?.user, request?.body);
      return reply?.code?.(201)?.send?.({ data: created ?? null });
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: guard,
      schema: {
        tags: ['Products'],
        summary: 'Get one product',
        security: [{ bearerAuth: [] }],
        params: idParams,
      },
    },
    async (request) => ({
      data: await productService.getById(request?.user, request?.params?.id),
    })
  );

  fastify.patch(
    '/:id',
    {
      preHandler: admin,
      schema: {
        tags: ['Products'],
        summary: 'Update product details. Stock is changed through inventory.',
        security: [{ bearerAuth: [] }],
        params: idParams,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            categoryId: { type: ['integer', 'null'] },
            sku: { type: 'string', minLength: 1, maxLength: 100 },
            name: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: ['string', 'null'] },
            price: { type: 'number', minimum: 0 },
            unit: { type: 'string', minLength: 1, maxLength: 50 },
            isActive: { type: 'boolean' },
            // Accepted so the service can explain that stock changes belong on /api/inventory/adjust.
            currentStock: { type: 'integer' },
          },
        },
      },
    },
    async (request) => ({
      data: await productService.update(request?.user, request?.params?.id, request?.body),
    })
  );

  fastify.delete(
    '/:id',
    {
      preHandler: admin,
      schema: {
        tags: ['Products'],
        summary: 'Hide a product. It stays in the database so old orders still resolve.',
        security: [{ bearerAuth: [] }],
        params: idParams,
      },
    },
    async (request) => ({
      data: await productService.remove(request?.user, request?.params?.id),
    })
  );
}

module.exports = productRoutes;
