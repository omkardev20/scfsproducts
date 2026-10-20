// src/bootstrap/index.js
const { createApp } = require('./app');
const { checkConnections } = require('./connections');
const { registerSwagger } = require('./swagger');
const { registerRoutes } = require('./routes');
const { listen } = require('./listen');

/**
 * Boots connections, plugins, routes, and the HTTP listener.
 */
const start = async () => {
  try {
    console.log('\n=============================================');
    console.log('🚀 Starting SupplyHub Server (Fastify)...');
    console.log('=============================================');

    await checkConnections();

    const app = createApp();
    await registerSwagger(app);
    await registerRoutes(app);
    await listen(app);
  } catch (error) {
    console.error('❌ Server startup error:', error?.message ?? error);
    process?.exit?.(1);
  }
};

module.exports = { start };
