// src/repositories/inventoryRepository.js
// Audit rows for stock. A negative change_quantity is stock leaving (an order).
// A positive change is stock coming back (a cancel or a delivery from the supplier).

const { rows, one } = require('../lib/sql');
const { toIso } = require('../lib/dates');

/**
 * @param {Record<string, unknown> | null} row
 */
const mapLog = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id ?? null,
    productId: row.product_id ?? null,
    sku: row.sku ?? null,
    productName: row.product_name ?? null,
    changeQuantity: Number(row.change_quantity) || 0,
    reason: row.reason ?? '',
    createdAt: toIso(row.created_at),
  };
};

/**
 * @param {{ limit: number, offset: number, productId: string | null }} query
 */
const listLogs = async ({ limit, offset, productId }) => {
  const list = await rows(
    `SELECT l.id, l.product_id, l.change_quantity, l.reason, l.created_at,
            p.sku, p.name AS product_name
     FROM inventory_logs l
     JOIN products p ON p.id = l.product_id
     WHERE ($1::uuid IS NULL OR l.product_id = $1)
     ORDER BY l.created_at DESC
     LIMIT $2 OFFSET $3`,
    [productId ?? null, limit, offset]
  );
  const countRow = await one(
    `SELECT COUNT(*)::int AS total
     FROM inventory_logs
     WHERE ($1::uuid IS NULL OR product_id = $1)`,
    [productId ?? null]
  );

  return {
    data: (list ?? []).map(mapLog),
    total: countRow?.total ?? 0,
  };
};

module.exports = { mapLog, listLogs };
