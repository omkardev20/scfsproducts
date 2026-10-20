// src/bootstrap/routes.js
const healthRoutes = require('../routes/health');

/**
 * Registers application route plugins.
 * @param {import('fastify').FastifyInstance} app
 */
const registerRoutes = async (app) => {
  await app?.register?.(healthRoutes);
};

module.exports = { registerRoutes };
