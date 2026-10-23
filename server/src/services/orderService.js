// src/services/orderService.js
// Places an order and moves it through pending -> confirmed -> in_transit -> delivered,
// or cancels it before it ships.
// The price is read from the product row inside the transaction. The client cannot
// send a cheaper price. SELECT ... FOR UPDATE locks those rows so two orders cannot
// sell the last unit at the same time.

const { AppError } = require('../lib/appError');
const { readPage } = require('../lib/page');
const { isAdmin, actorId, ownOutletId } = require('../lib/access');
const { one, rows, withTransaction } = require('../lib/sql');
const { invalidateProducts } = require('./cache');
const { findOrderById, listOrders } = require('../repositories/orderRepository');
const {
  lineSubtotal,
  summarize,
  canTransition,
  shouldRestoreStock,
  prepareItems,
} = require('./orderRules');

/**
 * Outlet managers are stuck to their own branch. Admins may pass another outlet.
 * @param {Record<string, unknown> | null | undefined} user
 * @param {string | null} orderOutletId
 */
const assertCanSeeOrder = (user, orderOutletId) => {
  if (isAdmin(user)) {
    return;
  }
  if (!ownOutletId(user) || ownOutletId(user) !== orderOutletId) {
    throw new AppError(403, 'You can only view orders for your outlet');
  }
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} query
 */
const list = async (user, query) => {
  const page = readPage(query);
  const status = query?.status ? String(query.status) : null;
  const requestedOutlet = query?.outletId ? String(query.outletId) : null;
  const outletId = isAdmin(user) ? requestedOutlet : (ownOutletId(user) ?? null);

  if (!isAdmin(user) && !outletId) {
    throw new AppError(403, 'Your account is not linked to an outlet');
  }

  const result = await listOrders({ ...page, outletId, status });
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
 * @param {string} id
 */
const getById = async (user, id) => {
  const order = await findOrderById(id);
  if (!order) {
    throw new AppError(404, 'Order was not found');
  }
  assertCanSeeOrder(user, order.outletId);
  return order;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} input
 */
const create = async (user, input) => {
  const role = user?.role ?? null;
  const requestedOutlet = input?.outletId ?? null;
  // A manager cannot place an order for a different branch, even if they send another id.
  const outletId = role === 'OUTLET_MANAGER' ? (ownOutletId(user) ?? null) : requestedOutlet;

  if (!outletId) {
    throw new AppError(400, 'An outlet is required');
  }
  if (role === 'OUTLET_MANAGER' && requestedOutlet && requestedOutlet !== outletId) {
    throw new AppError(403, 'You can only order for your own outlet');
  }

  const prepared = prepareItems(input?.items);
  // Lock products in a stable order so two orders cannot deadlock each other.
  const productIds = prepared.map((item) => item.productId).sort();
  const quantityById = new Map(prepared.map((item) => [item.productId, item.quantity]));

  const orderId = await withTransaction(async (client) => {
    const outlet = await one('SELECT id FROM outlets WHERE id = $1', [outletId], client);
    if (!outlet) {
      throw new AppError(404, 'Outlet was not found');
    }

    const locked = await rows(
      `SELECT id, sku, price, current_stock, is_active
       FROM products
       WHERE id = ANY($1::uuid[])
       FOR UPDATE`,
      [productIds],
      client
    );
    const byId = new Map((locked ?? []).map((row) => [row?.id, row]));
    const lines = [];

    for (const productId of productIds) {
      const product = byId.get(productId) ?? null;
      const quantity = quantityById.get(productId) ?? 0;
      if (!product) {
        throw new AppError(404, 'A product in this order was not found');
      }
      if (product.is_active === false) {
        throw new AppError(400, `Product ${product.sku ?? ''} is not available`);
      }

      const stock = Number(product.current_stock) || 0;
      if (stock < quantity) {
        throw new AppError(409, `Not enough stock for ${product.sku ?? 'a product'}`);
      }

      // Catalog price at this moment. Not the price the client wished for.
      const unitPrice = Number(product.price) || 0;
      lines.push({
        productId,
        quantity,
        unitPrice,
        subtotal: lineSubtotal(unitPrice, quantity),
      });
    }

    const totals = summarize(lines);
    const order = await one(
      `INSERT INTO orders (outlet_id, created_by, status, subtotal, tax_amount, total_amount)
       VALUES ($1, $2, 'pending', $3, $4, $5)
       RETURNING id`,
      [outletId, actorId(user), totals.subtotal, totals.taxAmount, totals.totalAmount],
      client
    );

    if (!order?.id) {
      throw new AppError(500, 'Could not create the order');
    }

    for (const line of lines) {
      await one(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, line.productId, line.quantity, line.unitPrice, line.subtotal],
        client
      );
      await one(
        `UPDATE products
         SET current_stock = current_stock - $2
         WHERE id = $1`,
        [line.productId, line.quantity],
        client
      );
      await one(
        `INSERT INTO inventory_logs (product_id, change_quantity, reason)
         VALUES ($1, $2, $3)`,
        [line.productId, -line.quantity, `order:${order.id}`],
        client
      );
    }

    return order.id;
  });

  // Cache is cleared only after the commit, so a rolled-back order does not wipe a good cache.
  for (const productId of productIds) {
    await invalidateProducts(productId);
  }

  return getById(user, orderId);
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {string} id
 * @param {string | null | undefined} nextStatus
 */
const changeStatus = async (user, id, nextStatus) => {
  const status = String(nextStatus ?? '');
  if (!isAdmin(user) && status !== 'cancelled') {
    throw new AppError(403, 'You can only cancel your own order');
  }

  const productIds = await withTransaction(async (client) => {
    const current = await one(
      'SELECT id, outlet_id, status FROM orders WHERE id = $1 FOR UPDATE',
      [id ?? null],
      client
    );
    if (!current) {
      throw new AppError(404, 'Order was not found');
    }
    assertCanSeeOrder(user, current.outlet_id ?? null);

    if (!canTransition(current.status, status)) {
      throw new AppError(400, `Cannot move an order from ${current.status ?? 'unknown'} to ${status || 'empty'}`);
    }

    const touched = [];
    if (shouldRestoreStock(current.status, status)) {
      const items = await rows(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id],
        client
      );
      const ids = (items ?? []).map((item) => item?.product_id).filter(Boolean).sort();
      if (ids.length > 0) {
        // Lock the same product rows an incoming order would lock.
        await rows(
          'SELECT id FROM products WHERE id = ANY($1::uuid[]) FOR UPDATE',
          [ids],
          client
        );
      }

      for (const item of items ?? []) {
        const quantity = Number(item?.quantity) || 0;
        await one(
          'UPDATE products SET current_stock = current_stock + $2 WHERE id = $1',
          [item?.product_id ?? null, quantity],
          client
        );
        await one(
          `INSERT INTO inventory_logs (product_id, change_quantity, reason)
           VALUES ($1, $2, $3)`,
          [item?.product_id ?? null, quantity, `cancel:${id}`],
          client
        );
        touched.push(item?.product_id);
      }
    }

    await one('UPDATE orders SET status = $2 WHERE id = $1', [id, status], client);
    return touched;
  });

  for (const productId of productIds ?? []) {
    await invalidateProducts(productId);
  }

  return getById(user, id);
};

module.exports = { list, getById, create, changeStatus };
