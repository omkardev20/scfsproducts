// src/repositories/productRepository.js
// The products table. Money and stock are numbers in the API even though
// PostgreSQL returns NUMERIC as a string.

const { rows, one, withTransaction } = require('../lib/sql');
const { toIso } = require('../lib/dates');

/**
 * @param {Record<string, unknown> | null} row
 */
const mapProduct = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id ?? null,
    categoryId: row.category_id ?? null,
    sku: row.sku ?? '',
    name: row.name ?? '',
    description: row.description ?? null,
    price: Number(row.price) || 0,
    currentStock: Number(row.current_stock) || 0,
    unit: row.unit ?? 'unit',
    isActive: row.is_active ?? true,
    createdAt: toIso(row.created_at),
  };
};

/**
 * Escapes LIKE wildcards so a search for "100%" does not match everything.
 * @param {unknown} value
 * @returns {string | null}
 */
const likeTerm = (value) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
};

/**
 * @param {{ limit: number, offset: number, search: string | null, includeInactive: boolean }} query
 */
const listProducts = async ({ limit, offset, search, includeInactive }) => {
  const term = likeTerm(search);
  const filters = [includeInactive === true, term, limit, offset];

  const list = await rows(
    `SELECT id, category_id, sku, name, description, price, current_stock, unit, is_active, created_at
     FROM products
     WHERE ($1::boolean = TRUE OR is_active = TRUE)
       AND ($2::text IS NULL OR name ILIKE $2 ESCAPE '\\' OR sku ILIKE $2 ESCAPE '\\')
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    filters
  );

  const countRow = await one(
    `SELECT COUNT(*)::int AS total
     FROM products
     WHERE ($1::boolean = TRUE OR is_active = TRUE)
       AND ($2::text IS NULL OR name ILIKE $2 ESCAPE '\\' OR sku ILIKE $2 ESCAPE '\\')`,
    [includeInactive === true, term]
  );

  return {
    data: (list ?? []).map(mapProduct),
    total: countRow?.total ?? 0,
  };
};

/**
 * @param {string} id
 */
const findProductById = async (id) => {
  const row = await one(
    `SELECT id, category_id, sku, name, description, price, current_stock, unit, is_active, created_at
     FROM products
     WHERE id = $1`,
    [id ?? null]
  );
  return mapProduct(row);
};

/**
 * Inserts the product and, when opening stock is above zero, an inventory log.
 * Both happen in one transaction so a failed log does not leave stock unexplained.
 * @param {{ categoryId: number | null, sku: string, name: string, description: string | null, price: number, currentStock: number, unit: string, isActive: boolean }} input
 */
const insertProduct = async (input) => {
  return withTransaction(async (client) => {
    const row = await one(
      `INSERT INTO products (category_id, sku, name, description, price, current_stock, unit, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, category_id, sku, name, description, price, current_stock, unit, is_active, created_at`,
      [
        input?.categoryId ?? null,
        input?.sku ?? null,
        input?.name ?? null,
        input?.description ?? null,
        input?.price ?? 0,
        input?.currentStock ?? 0,
        input?.unit ?? 'unit',
        input?.isActive ?? true,
      ],
      client
    );

    const opening = Number(input?.currentStock) || 0;
    if (opening > 0 && row?.id) {
      await one(
        `INSERT INTO inventory_logs (product_id, change_quantity, reason)
         VALUES ($1, $2, 'opening-stock')`,
        [row.id, opening],
        client
      );
    }

    return mapProduct(row);
  });
};

/**
 * Stock is not updated here. Stock changes go through inventory so every change is logged.
 * @param {string} id
 * @param {Record<string, unknown>} input
 */
const updateProduct = async (id, input) => {
  const current = await findProductById(id);
  if (!current) {
    return null;
  }

  const row = await one(
    `UPDATE products
     SET category_id = $2,
         sku = $3,
         name = $4,
         description = $5,
         price = $6,
         unit = $7,
         is_active = $8
     WHERE id = $1
     RETURNING id, category_id, sku, name, description, price, current_stock, unit, is_active, created_at`,
    [
      id,
      input?.categoryId === undefined ? current.categoryId : input.categoryId,
      input?.sku ?? current.sku,
      input?.name ?? current.name,
      input?.description === undefined ? current.description : input.description,
      input?.price === undefined ? current.price : input.price,
      input?.unit ?? current.unit,
      input?.isActive === undefined ? current.isActive : input.isActive,
    ]
  );
  return mapProduct(row);
};

/**
 * Hides the product from outlet managers. Past orders still point at this row.
 * @param {string} id
 */
const deactivateProduct = async (id) => {
  const row = await one(
    `UPDATE products
     SET is_active = FALSE
     WHERE id = $1
     RETURNING id, category_id, sku, name, description, price, current_stock, unit, is_active, created_at`,
    [id ?? null]
  );
  return mapProduct(row);
};

module.exports = {
  mapProduct,
  listProducts,
  findProductById,
  insertProduct,
  updateProduct,
  deactivateProduct,
};
