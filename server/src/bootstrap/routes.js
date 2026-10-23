// src/bootstrap/routes.js
const healthRoutes = require('../routes/health');
const authRoutes = require('../routes/authRoutes');
const outletRoutes = require('../routes/outletRoutes');

/**
 * Registers application route plugins.
 * @param {import('fastify').FastifyInstance} app
 */
const registerRoutes = async (app) => {
  await app?.register?.(healthRoutes);
  await app?.register?.(authRoutes, { prefix: '/api/auth' });
  await app?.register?.(outletRoutes, { prefix: '/api/outlets' });
};

module.exports = { registerRoutes };
