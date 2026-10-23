// src/bootstrap/errors.js
// Every failed request uses one JSON shape the frontend can rely on:
// { error: { message, details } }

const { AppError } = require('../lib/appError');
const { toAppError } = require('../lib/dbErrors');

/**
 * Registers the JSON error handler and the 404 handler.
 * Call this before the routes so their failures pass through it.
 * @param {import('fastify').FastifyInstance} app
 */
const registerErrors = async (app) => {
  app?.setErrorHandler?.((error, request, reply) => {
    const normalized = toAppError(error);
    const statusCode = normalized?.statusCode ?? error?.statusCode ?? 500;
    const isServerFault = statusCode >= 500;

    // A 500 message can contain SQL. The client only sees a fixed sentence.
    const message = isServerFault
      ? 'Internal server error'
      : (normalized?.message ?? error?.message ?? 'Request failed');

    if (isServerFault) {
      console.error('❌ Unhandled error:', error?.message ?? error);
    }

    // Fastify schema failures put an array on `validation` (missing field, wrong type).
    const details = normalized instanceof AppError
      ? (normalized?.details ?? null)
      : (error?.validation ?? null);

    reply?.code?.(statusCode)?.send?.({
      error: {
        message,
        details,
      },
    });
  });

  app?.setNotFoundHandler?.((request, reply) => {
    reply?.code?.(404)?.send?.({
      error: {
        message: 'Route not found',
        details: {
          method: request?.method ?? null,
          url: request?.url ?? null,
        },
      },
    });
  });
};

module.exports = { registerErrors };
