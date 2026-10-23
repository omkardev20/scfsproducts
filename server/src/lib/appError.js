// src/lib/appError.js
// A known request failure: bad input, missing login, or a forbidden action.
// Services throw this. The error handler turns it into JSON for the frontend.
// Unexpected bugs stay normal Errors and become a generic 500.

class AppError extends Error {
  /**
   * @param {number} statusCode HTTP status the client should receive
   * @param {string} message Safe sentence the frontend can show
   * @param {unknown} [details] Field errors, or null when there are none
   */
  constructor(statusCode, message, details) {
    // Error requires a string. A missing message must not crash the handler.
    super(message ?? 'Request failed');
    this.name = 'AppError';
    // A bad code must not become NaN when the handler reads it.
    this.statusCode = Number(statusCode) || 500;
    this.details = details ?? null;
  }
}

module.exports = { AppError };
