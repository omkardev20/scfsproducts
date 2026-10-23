// src/bootstrap/auth.js
// JWT plugin. Login creates a token. Protected routes call authenticate
// before their handler runs. requireRole('SUPPLIER_ADMIN') is a second gate.

const jwt = require('@fastify/jwt');
const { AppError } = require('../lib/appError');

/**
 * Registers @fastify/jwt and the two hooks routes reuse.
 * The process refuses to boot without JWT_SECRET so tokens cannot be signed
 * with an empty default.
 * @param {import('fastify').FastifyInstance} app
 */
const registerAuth = async (app) => {
  const secret = process.env.JWT_SECRET ?? null;
  if (!secret) {
    throw new Error('JWT_SECRET is missing from the environment');
  }

  await app?.register?.(jwt, {
    secret,
    // Eight hours matches a working shift. The frontend must log in again after that.
    sign: { expiresIn: '8h' },
  });

  // Throws 401 when the Authorization header is missing or the token is bad.
  app?.decorate?.('authenticate', async (request) => {
    try {
      await request?.jwtVerify?.();
    } catch (error) {
      throw new AppError(401, 'Login is required');
    }
  });

  // Use after authenticate. Example: { preHandler: [app.authenticate, app.requireRole('SUPPLIER_ADMIN')] }
  app?.decorate?.('requireRole', (...roles) => {
    return async (request) => {
      const role = request?.user?.role ?? null;
      if (!roles.includes(role)) {
        throw new AppError(403, 'You do not have permission for this action');
      }
    };
  });
};

module.exports = { registerAuth };
