// tests/orderRules.test.js
// Order math and status rules, without a database.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  lineSubtotal,
  summarize,
  canTransition,
  shouldRestoreStock,
  prepareItems,
} = require('../src/services/orderRules');

test('line totals and 5 percent tax round to cents', () => {
  const lines = [
    { subtotal: lineSubtotal(10.5, 2) },
    { subtotal: lineSubtotal(4, 1) },
  ];
  assert.deepEqual(summarize(lines), {
    subtotal: 25,
    taxAmount: 1.25,
    totalAmount: 26.25,
    taxRate: 0.05,
  });
});

test('status can move forward and a shipped order cannot be cancelled', () => {
  assert.equal(canTransition('pending', 'confirmed'), true);
  assert.equal(canTransition('pending', 'delivered'), false);
  assert.equal(canTransition('in_transit', 'cancelled'), false);
  assert.equal(shouldRestoreStock('pending', 'cancelled'), true);
  assert.equal(shouldRestoreStock('confirmed', 'cancelled'), true);
  assert.equal(shouldRestoreStock('in_transit', 'delivered'), false);
});

test('duplicate products in one order are merged', () => {
  const items = prepareItems([
    { productId: 'a', quantity: 2 },
    { productId: 'a', quantity: 3 },
  ]);
  assert.deepEqual(items, [{ productId: 'a', quantity: 5 }]);
});

test('an empty order is rejected', () => {
  assert.throws(() => prepareItems([]), /at least one product/);
});
