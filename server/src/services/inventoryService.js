// src/services/inventoryService.js
// Manual stock changes for the supplier admin (a delivery arrived, or waste was thrown out).
// Orders change stock too, but they do it inside orderService.

const { AppError } = require('../lib/appError');
const { toIso } = require('../lib/dates');
const { readPage } = require('../lib/page');
const { assertAdmin } = require('../lib/access');
const { one, withTransaction } = require('../lib/sql');
const { invalidateProducts } = require('./cache');
const { listLogs } = require('../repositories/inventoryRepository');

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} query
 */
const list = async (user, query) => {
  assertAdmin(user);
  const page = readPage(query);
  const productId = query?.productId ? String(query.productId) : null;
  const result = await listLogs({ ...page, productId });

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
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} input
 */
const adjust = async (user, input) => {
  assertAdmin(user);

  const productId = input?.productId ?? null;
  const changeQuantity = Number(input?.changeQuantity);
  const reason = String(input?.reason ?? '').trim();

  if (!productId) {
    throw new AppError(400, 'productId is required');
  }
  if (!Number.isInteger(changeQuantity) || changeQuantity === 0) {
    throw new AppError(400, 'changeQuantity must be a non-zero whole number');
  }
  if (!reason) {
    throw new AppError(400, 'A reason is required');
  }

  const log = await withTransaction(async (client) => {
    const product = await one(
      'SELECT id, current_stock FROM products WHERE id = $1 FOR UPDATE',
      [productId],
      client
    );
    if (!product) {
      throw new AppError(404, 'Product was not found');
    }

    const nextStock = (Number(product.current_stock) || 0) + changeQuantity;
    if (nextStock < 0) {
      throw new AppError(409, 'Stock cannot go below zero');
    }

    await one(
      'UPDATE products SET current_stock = $2 WHERE id = $1',
      [productId, nextStock],
      client
    );
    return one(
      `INSERT INTO inventory_logs (product_id, change_quantity, reason)
       VALUES ($1, $2, $3)
       RETURNING id, product_id, change_quantity, reason, created_at`,
      [productId, changeQuantity, reason],
      client
    );
  });

  await invalidateProducts(productId);

  return {
    id: log?.id ?? null,
    productId: log?.product_id ?? productId,
    changeQuantity: Number(log?.change_quantity) || changeQuantity,
    reason: log?.reason ?? reason,
    createdAt: toIso(log?.created_at),
  };
};

module.exports = { list, adjust };
