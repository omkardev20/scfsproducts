// tests/slug.test.js
// The slug helper has no database, so this file can run on its own.

const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('../src/lib/slug');

test('slugify lowercases words and joins them with a dash', () => {
  assert.equal(slugify('Burger Buns'), 'burger-buns');
});

test('slugify returns null when nothing usable is left', () => {
  assert.equal(slugify('---'), null);
  assert.equal(slugify(null), null);
});
