// src/lib/slug.js
// Turns a category name into a URL-safe unique key, for example "Burger Buns" -> "burger-buns".

/**
 * @param {unknown} value
 * @returns {string | null} null when the input has no letters or digits
 */
const slugify = (value) => {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || null;
};

module.exports = { slugify };
