// src/services/productService.js
// Catalog rules plus the Redis cache.
// Outlet managers only see active products. Admins can ask for inactive ones too.
// The client never sends a price that is trusted on an order; this service is
// where the catalog price is stored.

const { AppError } = require('../lib/appError');
const { readPage } = require('../lib/page');
const { isAdmin, assertAdmin } = require('../lib/access');
const { one } = require('../lib/sql');
const {
  PRODUCT_LIST_KEY,
  productKey,
  readCache,
  writeCache,
  invalidateProducts,
} = require('./cache');
const {
  listProducts,
  findProductById,
  insertProduct,
  updateProduct,
  deactivateProduct,
} = require('../repositories/productRepository');

/**
 * @param {unknown} value
 * @returns {number}
 */
const readMoney = (value) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new AppError(400, 'Price must be zero or greater');
  }
  return Math.round(price * 100) / 100;
};

/**
 * @param {unknown} value
 * @returns {number}
 */
const readStock = (value) => {
  const stock = Number(value ?? 0);
  if (!Number.isInteger(stock) || stock < 0) {
    throw new AppError(400, 'Stock must be a whole number that is zero or greater');
  }
  return stock;
};

/**
 * A category id of null is allowed. A real id must exist.
 * @param {unknown} categoryId
 */
const assertCategory = async (categoryId) => {
  if (categoryId == null) {
    return null;
  }
  const category = await one('SELECT id FROM categories WHERE id = $1', [categoryId]);
  if (!category) {
    throw new AppError(400, 'Category was not found');
  }
  return category.id ?? categoryId;
};

/**
 * Default page, no search, active products only. That is the cached response.
 * @param {{ limit: number, offset: number, search: string | null, includeInactive: boolean }} query
 */
const isDefaultList = (query) => {
  return query.limit === 50
    && query.offset === 0
    && !query.search
    && query.includeInactive === false;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} query
 */
const list = async (user, query) => {
  const page = readPage(query);
  const search = String(query?.search ?? '').trim() || null;
  const includeInactive = isAdmin(user) && (query?.includeInactive === true || query?.includeInactive === 'true');
  const parsed = { ...page, search, includeInactive };

  if (isDefaultList(parsed)) {
    const cached = await readCache(PRODUCT_LIST_KEY);
    if (cached) {
      return cached;
    }
  }

  const result = await listProducts(parsed);
  const body = {
    data: result?.data ?? [],
    meta: {
      limit: page.limit,
      offset: page.offset,
      total: result?.total ?? 0,
    },
  };

  if (isDefaultList(parsed)) {
    await writeCache(PRODUCT_LIST_KEY, body);
  }

  return body;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {string} id
 */
const getById = async (user, id) => {
  const cacheKey = productKey(id);
  const cached = await readCache(cacheKey);
  const product = cached ?? await findProductById(id);

  if (!product) {
    throw new AppError(404, 'Product was not found');
  }
  if (!cached) {
    await writeCache(cacheKey, product);
  }
  // Hidden products stay out of the outlet catalog. Admins can still open them.
  if (product.isActive === false && !isAdmin(user)) {
    throw new AppError(404, 'Product was not found');
  }

  return product;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} input
 */
const create = async (user, input) => {
  assertAdmin(user);

  const sku = String(input?.sku ?? '').trim();
  const name = String(input?.name ?? '').trim();
  if (!sku) {
    throw new AppError(400, 'SKU is required');
  }
  if (!name) {
    throw new AppError(400, 'Product name is required');
  }

  const created = await insertProduct({
    categoryId: await assertCategory(input?.categoryId ?? null),
    sku,
    name,
    description: input?.description ?? null,
    price: readMoney(input?.price),
    currentStock: readStock(input?.currentStock ?? 0),
    unit: String(input?.unit ?? 'unit').trim() || 'unit',
    isActive: input?.isActive ?? true,
  });

  await invalidateProducts(created?.id ?? null);
  return created;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {string} id
 * @param {Record<string, unknown> | null | undefined} input
 */
const update = async (user, id, input) => {
  assertAdmin(user);

  const patch = {};
  if (input?.categoryId !== undefined) {
    patch.categoryId = await assertCategory(input.categoryId);
  }
  if (input?.sku !== undefined) {
    const sku = String(input.sku ?? '').trim();
    if (!sku) {
      throw new AppError(400, 'SKU cannot be empty');
    }
    patch.sku = sku;
  }
  if (input?.name !== undefined) {
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new AppError(400, 'Product name cannot be empty');
    }
    patch.name = name;
  }
  if (input?.description !== undefined) {
    patch.description = input.description ?? null;
  }
  if (input?.price !== undefined) {
    patch.price = readMoney(input.price);
  }
  if (input?.unit !== undefined) {
    patch.unit = String(input.unit ?? '').trim() || 'unit';
  }
  if (input?.isActive !== undefined) {
    patch.isActive = input.isActive === true;
  }
  if (input?.currentStock !== undefined) {
    throw new AppError(400, 'Change stock with POST /api/inventory/adjust so the change is logged');
  }
  if (Object.keys(patch).length === 0) {
    throw new AppError(400, 'Provide at least one field to update');
  }

  const updated = await updateProduct(id, patch);
  if (!updated) {
    throw new AppError(404, 'Product was not found');
  }
  await invalidateProducts(updated.id);
  return updated;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {string} id
 */
const remove = async (user, id) => {
  assertAdmin(user);
  const hidden = await deactivateProduct(id);
  if (!hidden) {
    throw new AppError(404, 'Product was not found');
  }
  await invalidateProducts(hidden.id);
  return hidden;
};

module.exports = { list, getById, create, update, remove };
