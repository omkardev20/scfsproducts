// src/repositories/orderRepository.js
// Reads orders and their line items. Creating an order is a transaction in the service,
// because it also changes stock and writes inventory logs.

const { rows, one } = require('../lib/sql');
const { toIso } = require('../lib/dates');

/**
 * @param {Record<string, unknown> | null} row
 */
const mapOrder = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id ?? null,
    outletId: row.outlet_id ?? null,
    outletName: row.outlet_name ?? null,
    branchCode: row.branch_code ?? null,
    createdBy: row.created_by ?? null,
    status: row.status ?? null,
    subtotal: Number(row.subtotal) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    createdAt: toIso(row.created_at),
  };
};

/**
 * @param {Record<string, unknown>} row
 */
const mapItem = (row) => ({
  id: row?.item_id ?? null,
  productId: row?.product_id ?? null,
  sku: row?.product_sku ?? null,
  name: row?.product_name ?? null,
  unit: row?.product_unit ?? null,
  quantity: Number(row?.quantity) || 0,
  unitPrice: Number(row?.unit_price) || 0,
  subtotal: Number(row?.item_subtotal) || 0,
});

const ORDER_DETAIL_SQL = `
  SELECT
    o.id, o.outlet_id, o.created_by, o.status, o.subtotal, o.tax_amount, o.total_amount, o.created_at,
    ot.name AS outlet_name, ot.branch_code,
    oi.id AS item_id, oi.product_id, oi.quantity, oi.unit_price, oi.subtotal AS item_subtotal,
    p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit
  FROM orders o
  JOIN outlets ot ON ot.id = o.outlet_id
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE o.id = $1
  ORDER BY oi.id
`;

/**
 * One order plus its items. A left join repeats the order columns once per item.
 * @param {string} id
 * @param {import('pg').PoolClient | null} [client]
 */
const findOrderById = async (id, client) => {
  const list = await rows(ORDER_DETAIL_SQL, [id ?? null], client);
  const first = list?.[0] ?? null;
  if (!first) {
    return null;
  }

  const order = mapOrder(first);
  order.items = (list ?? []).filter((row) => row?.item_id).map(mapItem);
  return order;
};

/**
 * List rows do not include line items. The frontend loads GET /api/orders/:id for those.
 * @param {{ limit: number, offset: number, outletId: string | null, status: string | null }} query
 */
const listOrders = async ({ limit, offset, outletId, status }) => {
  const filters = [outletId ?? null, status ?? null, limit, offset];
  const list = await rows(
    `SELECT o.id, o.outlet_id, o.created_by, o.status, o.subtotal, o.tax_amount, o.total_amount, o.created_at,
            ot.name AS outlet_name, ot.branch_code
     FROM orders o
     JOIN outlets ot ON ot.id = o.outlet_id
     WHERE ($1::uuid IS NULL OR o.outlet_id = $1)
       AND ($2::text IS NULL OR o.status = $2)
     ORDER BY o.created_at DESC
     LIMIT $3 OFFSET $4`,
    filters
  );
  const countRow = await one(
    `SELECT COUNT(*)::int AS total
     FROM orders
     WHERE ($1::uuid IS NULL OR outlet_id = $1)
       AND ($2::text IS NULL OR status = $2)`,
    [outletId ?? null, status ?? null]
  );

  return {
    data: (list ?? []).map((row) => ({ ...mapOrder(row), items: [] })),
    total: countRow?.total ?? 0,
  };
};

module.exports = { findOrderById, listOrders };
