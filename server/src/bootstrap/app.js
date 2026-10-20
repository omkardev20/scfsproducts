// src/bootstrap/app.js
const fastify = require('fastify');

/**
 * Creates the Fastify instance used by the rest of the server.
 */
const createApp = () => {
  return fastify({
    logger: false,
  });
};

module.exports = { createApp };
