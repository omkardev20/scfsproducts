// src/lib/sql.js
// Thin helpers around the pg pool.
// Repositories call these so a missing pool or an empty result does not throw
// on `.rows[0]`. Multi-table work uses withTransaction so a failure rolls back.

const { pool } = require('../config/db');

/**
 * Runs a parameterized query and returns the row array (empty when there are none).
 * Pass `client` inside a transaction. Omit it to use the shared pool.
 * @param {string} text
 * @param {unknown[]} [params]
 * @param {import('pg').PoolClient | null} [client]
 */
const rows = async (text, params, client) => {
  const executor = client ?? pool;
  const result = await executor?.query?.(text, params ?? []);
  return result?.rows ?? [];
};

/**
 * Same as rows(), but returns the first row or null.
 * @param {string} text
 * @param {unknown[]} [params]
 * @param {import('pg').PoolClient | null} [client]
 */
const one = async (text, params, client) => {
  const list = await rows(text, params, client);
  return list?.[0] ?? null;
};

/**
 * Opens a transaction, runs `work`, then commits.
 * Any throw rolls the transaction back and rethrows the original error.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
const withTransaction = async (work) => {
  const client = await pool?.connect?.();
  if (!client) {
    throw new Error('Database connection is unavailable');
  }

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError?.message ?? rollbackError);
    }
    throw error;
  } finally {
    client.release?.();
  }
};

module.exports = { rows, one, withTransaction };
