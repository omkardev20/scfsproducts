// src/lib/page.js
// List endpoints accept ?limit=&offset=. Values are clamped here so a huge
// limit cannot make one request read the whole table.

/**
 * @param {Record<string, unknown> | null | undefined} query
 * @returns {{ limit: number, offset: number }}
 */
const readPage = (query) => {
  // Missing or junk input falls back to a small page, never NaN.
  const limit = Math.min(Math.max(Number(query?.limit) || 50, 1), 100);
  const offset = Math.max(Number(query?.offset) || 0, 0);
  return { limit, offset };
};

module.exports = { readPage };
