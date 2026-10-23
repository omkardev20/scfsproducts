// src/bootstrap/routes.js
const healthRoutes = require('../routes/health');
const authRoutes = require('../routes/authRoutes');

/**
 * Registers application route plugins.
 * @param {import('fastify').FastifyInstance} app
 */
const registerRoutes = async (app) => {
  await app?.register?.(healthRoutes);
  await app?.register?.(authRoutes, { prefix: '/api/auth' });
};

module.exports = { registerRoutes };
