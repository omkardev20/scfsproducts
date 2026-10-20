// src/bootstrap/swagger.js
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');

const swaggerOptions = {
  openapi: {
    info: {
      title: 'SupplyHub API',
      description: 'B2B Food Chain Supply Management API Documentation',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server',
      },
    ],
    tags: [
      { name: 'System', description: 'System health & operational endpoints' },
    ],
  },
};

const swaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  exposeRoute: true,
};

/**
 * Registers OpenAPI docs and the Swagger UI on the Fastify app.
 * @param {import('fastify').FastifyInstance} app
 */
const registerSwagger = async (app) => {
  await app?.register?.(swagger, swaggerOptions);
  await app?.register?.(swaggerUi, swaggerUiOptions);
};

module.exports = { registerSwagger };
