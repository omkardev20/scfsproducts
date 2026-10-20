// src/bootstrap/listen.js

/**
 * Binds the server and prints the local URLs.
 * @param {import('fastify').FastifyInstance} app
 */
const listen = async (app) => {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST ?? '0.0.0.0';

  await app?.listen?.({ port, host });
  console.log(`\n🎉 Server listening at http://${host}:${port}`);
  console.log(`👉 Health check : http://localhost:${port}/health`);
  console.log(`📚 Swagger Docs : http://localhost:${port}/docs\n`);
};

module.exports = { listen };
