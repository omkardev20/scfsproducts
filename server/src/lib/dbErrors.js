// src/lib/dbErrors.js
// PostgreSQL answers with error codes. This file turns the ones we care about
// into HTTP errors. Queries stay parameterized, so these codes are the database
// rejecting a value (duplicate key, missing parent, bad UUID).

const { AppError } = require('./appError');

/**
 * Maps a thrown value to an AppError when the cause is known.
 * Unknown errors are returned unchanged so the handler can hide them as 500.
 * @param {unknown} error
 * @returns {AppError | unknown}
 */
const toAppError = (error) => {
  // A service already chose the status and the message. Keep both.
  if (error instanceof AppError) {
    return error;
  }

  const code = error?.code ?? null;

  // 23505 unique_violation: same email, SKU, or branch code was inserted twice.
  if (code === '23505') {
    return new AppError(409, 'A record with that unique value already exists');
  }

  // 23503 foreign_key_violation: the parent row is missing, or this row is still in use.
  if (code === '23503') {
    return new AppError(400, 'Related record is missing, or this record is still in use');
  }

  // 22P02 invalid_text_representation: for example "abc" was sent where a UUID belongs.
  if (code === '22P02') {
    return new AppError(400, 'One of the ids or values has an invalid format');
  }

  return error;
};

module.exports = { toAppError };
