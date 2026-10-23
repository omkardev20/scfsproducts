// src/services/categoryService.js
// Any logged-in user can read categories. Only a supplier admin can change them.

const { AppError } = require('../lib/appError');
const { readPage } = require('../lib/page');
const { slugify } = require('../lib/slug');
const { assertAdmin } = require('../lib/access');
const {
  listCategories,
  findCategoryById,
  insertCategory,
  updateCategory,
  deleteCategory,
} = require('../repositories/categoryRepository');

/**
 * Builds the stored name and slug. An explicit slug wins. Otherwise the name is slugified.
 * @param {Record<string, unknown> | null | undefined} input
 * @param {{ name?: string, slug?: string }} [current]
 */
const readNameAndSlug = (input, current) => {
  const name = input?.name !== undefined
    ? String(input?.name ?? '').trim()
    : (current?.name ?? '');
  if (!name) {
    throw new AppError(400, 'Category name is required');
  }

  const rawSlug = input?.slug !== undefined ? input.slug : (current?.slug ?? name);
  const slug = slugify(rawSlug);
  if (!slug) {
    throw new AppError(400, 'Category slug must contain letters or digits');
  }

  return { name, slug };
};

/**
 * @param {Record<string, unknown> | null | undefined} query
 */
const list = async (query) => {
  const page = readPage(query);
  const result = await listCategories(page);
  return {
    data: result?.data ?? [],
    meta: {
      limit: page.limit,
      offset: page.offset,
      total: result?.total ?? 0,
    },
  };
};

/**
 * @param {number | string} id
 */
const getById = async (id) => {
  const category = await findCategoryById(id);
  if (!category) {
    throw new AppError(404, 'Category was not found');
  }
  return category;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} input
 */
const create = async (user, input) => {
  assertAdmin(user);
  return insertCategory(readNameAndSlug(input));
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {number | string} id
 * @param {Record<string, unknown> | null | undefined} input
 */
const update = async (user, id, input) => {
  assertAdmin(user);
  const current = await getById(id);
  if (input?.name === undefined && input?.slug === undefined) {
    throw new AppError(400, 'Provide a name or a slug to update');
  }
  return updateCategory(id, readNameAndSlug(input, current));
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {number | string} id
 */
const remove = async (user, id) => {
  assertAdmin(user);
  const deleted = await deleteCategory(id);
  if (!deleted) {
    throw new AppError(404, 'Category was not found');
  }
  return deleted;
};

module.exports = { list, getById, create, update, remove };
