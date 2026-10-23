// src/routes/authRoutes.js
// Public: POST /signup and POST /login.
// Private: GET /me, which reads the user back out of the token.

const { signup, login, issueSession } = require('../services/authService');

const userResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    outletId: { type: ['string', 'null'] },
    email: { type: 'string' },
    fullName: { type: 'string' },
    role: { type: 'string' },
    createdAt: { type: ['string', 'null'] },
  },
};

const credentialsBody = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', minLength: 3 },
    password: { type: 'string', minLength: 8 },
  },
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function authRoutes(fastify) {
  // Signs whatever payload the service built. The secret stays inside the JWT plugin.
  const sign = (payload) => fastify?.jwt?.sign?.(payload);

  fastify.post(
    '/signup',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Create an account and return a token',
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'password', 'fullName', 'role'],
          properties: {
            email: { type: 'string', minLength: 3 },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string', minLength: 1 },
            role: { type: 'string', enum: ['SUPPLIER_ADMIN', 'OUTLET_MANAGER'] },
            outletId: { type: ['string', 'null'] },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await signup(request?.body);
      const session = issueSession(user, sign);
      return reply?.code?.(201)?.send?.({ data: session });
    }
  );

  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Exchange email and password for a token',
        body: credentialsBody,
      },
    },
    async (request, reply) => {
      const user = await login(request?.body);
      const session = issueSession(user, sign);
      return reply?.code?.(200)?.send?.({ data: session });
    }
  );

  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Read the user stored in the current token',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              data: userResponse,
            },
          },
        },
      },
    },
    async (request) => {
      const user = request?.user ?? {};
      return {
        data: {
          id: user.sub ?? null,
          email: user.email ?? null,
          fullName: user.fullName ?? null,
          role: user.role ?? null,
          outletId: user.outletId ?? null,
        },
      };
    }
  );
}

module.exports = authRoutes;
