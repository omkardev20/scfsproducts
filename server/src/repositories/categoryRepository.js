// src/repositories/categoryRepository.js
// Product groups such as "buns" or "sauces". The slug is unique.

const { rows, one } = require('../lib/sql');

/**
 * @param {Record<string, unknown> | null} row
 */
const mapCategory = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id ?? null,
    name: row.name ?? '',
    slug: row.slug ?? '',
  };
};

/**
 * @param {{ limit: number, offset: number }} page
 */
const listCategories = async ({ limit, offset }) => {
  const list = await rows(
    `SELECT id, name, slug
     FROM categories
     ORDER BY name ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const countRow = await one('SELECT COUNT(*)::int AS total FROM categories');

  return {
    data: (list ?? []).map(mapCategory),
    total: countRow?.total ?? 0,
  };
};

/**
 * @param {number | string} id
 */
const findCategoryById = async (id) => {
  const row = await one('SELECT id, name, slug FROM categories WHERE id = $1', [id ?? null]);
  return mapCategory(row);
};

/**
 * @param {{ name: string, slug: string }} input
 */
const insertCategory = async (input) => {
  const row = await one(
    `INSERT INTO categories (name, slug)
     VALUES ($1, $2)
     RETURNING id, name, slug`,
    [input?.name ?? null, input?.slug ?? null]
  );
  return mapCategory(row);
};

/**
 * @param {number | string} id
 * @param {{ name: string, slug: string }} input
 */
const updateCategory = async (id, input) => {
  const row = await one(
    `UPDATE categories
     SET name = $2, slug = $3
     WHERE id = $1
     RETURNING id, name, slug`,
    [id ?? null, input?.name ?? null, input?.slug ?? null]
  );
  return mapCategory(row);
};

/**
 * Deleting a category sets products.category_id to null (ON DELETE SET NULL).
 * The products themselves stay in the catalog.
 * @param {number | string} id
 */
const deleteCategory = async (id) => {
  const row = await one(
    'DELETE FROM categories WHERE id = $1 RETURNING id, name, slug',
    [id ?? null]
  );
  return mapCategory(row);
};

module.exports = {
  listCategories,
  findCategoryById,
  insertCategory,
  updateCategory,
  deleteCategory,
};
