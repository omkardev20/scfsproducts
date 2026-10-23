// src/services/orderRules.js
// Pure order rules. No database. Tests cover this file on its own.
// Tax is 5 percent of the subtotal. The frontend displays the numbers the
// server returns and does not send its own prices.

const { AppError } = require('../lib/appError');

const TAX_RATE = 0.05;

// Legal next statuses. Anything missing from the list is rejected.
const NEXT_STATUS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Rounds to cents so 10.005 does not drift through the order total.
 * @param {unknown} value
 * @returns {number}
 */
const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * @param {unknown} unitPrice
 * @param {unknown} quantity
 * @returns {number}
 */
const lineSubtotal = (unitPrice, quantity) => money((Number(unitPrice) || 0) * (Number(quantity) || 0));

/**
 * @param {Array<{ subtotal?: number }> | null | undefined} lines
 */
const summarize = (lines) => {
  const subtotal = money((lines ?? []).reduce((sum, line) => sum + (Number(line?.subtotal) || 0), 0));
  const taxAmount = money(subtotal * TAX_RATE);
  const totalAmount = money(subtotal + taxAmount);
  return { subtotal, taxAmount, totalAmount, taxRate: TAX_RATE };
};

/**
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 */
const canTransition = (from, to) => (NEXT_STATUS[from] ?? []).includes(to);

/**
 * Stock was reserved when the order was placed. Cancelling before it ships puts it back.
 * A delivered order has already left the warehouse, so cancelling is not allowed at all.
 * @param {string | null | undefined} from
 * @param {string | null | undefined} to
 */
const shouldRestoreStock = (from, to) => {
  return to === 'cancelled' && (from === 'pending' || from === 'confirmed');
};

/**
 * Merges duplicate product ids and checks each quantity.
 * The client does not send a price. The service reads the catalog price later.
 * @param {unknown} items
 * @returns {Array<{ productId: string, quantity: number }>}
 */
const prepareItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, 'An order needs at least one product');
  }

  const merged = new Map();

  for (const item of items) {
    const productId = item?.productId ?? null;
    const quantity = Number(item?.quantity);

    if (!productId) {
      throw new AppError(400, 'Each item needs a productId');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError(400, 'Quantity must be a whole number greater than 0');
    }

    const previous = merged.get(productId) ?? 0;
    merged.set(productId, previous + quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
};

module.exports = {
  TAX_RATE,
  money,
  lineSubtotal,
  summarize,
  canTransition,
  shouldRestoreStock,
  prepareItems,
};
