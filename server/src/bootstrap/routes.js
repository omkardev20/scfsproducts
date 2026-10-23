// src/bootstrap/routes.js
const healthRoutes = require('../routes/health');
const authRoutes = require('../routes/authRoutes');
const outletRoutes = require('../routes/outletRoutes');
const categoryRoutes = require('../routes/categoryRoutes');

/**
 * Registers application route plugins.
 * @param {import('fastify').FastifyInstance} app
 */
const registerRoutes = async (app) => {
  await app?.register?.(healthRoutes);
  await app?.register?.(authRoutes, { prefix: '/api/auth' });
  await app?.register?.(outletRoutes, { prefix: '/api/outlets' });
  await app?.register?.(categoryRoutes, { prefix: '/api/categories' });
};

module.exports = { registerRoutes };
