// src/bootstrap/routes.js
const healthRoutes = require('../routes/health');
const authRoutes = require('../routes/authRoutes');
const outletRoutes = require('../routes/outletRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const productRoutes = require('../routes/productRoutes');
const orderRoutes = require('../routes/orderRoutes');
const inventoryRoutes = require('../routes/inventoryRoutes');

/**
 * Registers application route plugins.
 * @param {import('fastify').FastifyInstance} app
 */
const registerRoutes = async (app) => {
  await app?.register?.(healthRoutes);
  await app?.register?.(authRoutes, { prefix: '/api/auth' });
  await app?.register?.(outletRoutes, { prefix: '/api/outlets' });
  await app?.register?.(categoryRoutes, { prefix: '/api/categories' });
  await app?.register?.(productRoutes, { prefix: '/api/products' });
  await app?.register?.(orderRoutes, { prefix: '/api/orders' });
  await app?.register?.(inventoryRoutes, { prefix: '/api/inventory' });
};

module.exports = { registerRoutes };
