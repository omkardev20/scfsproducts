// src/lib/dates.js
// PostgreSQL timestamps arrive as Date objects. The API contract uses ISO strings.

/**
 * Converts a database timestamp into an ISO string.
 * Missing or invalid values become null so the frontend never sees "Invalid Date".
 * @param {unknown} value
 * @returns {string | null}
 */
const toIso = (value) => {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date?.getTime?.())) {
    return null;
  }

  return date.toISOString();
};

module.exports = { toIso };
