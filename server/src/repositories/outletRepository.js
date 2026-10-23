// src/repositories/outletRepository.js
// Reads and writes the outlets table. An outlet is one restaurant branch.

const { rows, one } = require('../lib/sql');
const { toIso } = require('../lib/dates');

/**
 * @param {Record<string, unknown> | null} row
 */
const mapOutlet = (row) => {
  if (!row) {
    return null;
  }

  return {
    id: row.id ?? null,
    name: row.name ?? '',
    branchCode: row.branch_code ?? '',
    address: row.address ?? null,
    phone: row.phone ?? null,
    createdAt: toIso(row.created_at),
  };
};

/**
 * @param {{ limit: number, offset: number, outletId: string | null }} query
 * When outletId is set, the list is that one branch (used for outlet managers).
 */
const listOutlets = async ({ limit, offset, outletId }) => {
  const list = await rows(
    `SELECT id, name, branch_code, address, phone, created_at
     FROM outlets
     WHERE ($1::uuid IS NULL OR id = $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [outletId ?? null, limit, offset]
  );

  const countRow = await one(
    `SELECT COUNT(*)::int AS total
     FROM outlets
     WHERE ($1::uuid IS NULL OR id = $1)`,
    [outletId ?? null]
  );

  return {
    data: (list ?? []).map(mapOutlet),
    total: countRow?.total ?? 0,
  };
};

/**
 * @param {string} id
 */
const findOutletById = async (id) => {
  const row = await one(
    `SELECT id, name, branch_code, address, phone, created_at
     FROM outlets
     WHERE id = $1`,
    [id ?? null]
  );
  return mapOutlet(row);
};

/**
 * @param {{ name: string, branchCode: string, address: string | null, phone: string | null }} input
 */
const insertOutlet = async (input) => {
  const row = await one(
    `INSERT INTO outlets (name, branch_code, address, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, branch_code, address, phone, created_at`,
    [input?.name ?? null, input?.branchCode ?? null, input?.address ?? null, input?.phone ?? null]
  );
  return mapOutlet(row);
};

/**
 * Updates only the fields the caller passed. Undefined means "leave it".
 * @param {string} id
 * @param {Record<string, unknown>} input
 */
const updateOutlet = async (id, input) => {
  const current = await findOutletById(id);
  if (!current) {
    return null;
  }

  const row = await one(
    `UPDATE outlets
     SET name = $2,
         branch_code = $3,
         address = $4,
         phone = $5
     WHERE id = $1
     RETURNING id, name, branch_code, address, phone, created_at`,
    [
      id,
      input?.name ?? current.name,
      input?.branchCode ?? current.branchCode,
      input?.address === undefined ? current.address : input.address,
      input?.phone === undefined ? current.phone : input.phone,
    ]
  );
  return mapOutlet(row);
};

module.exports = { listOutlets, findOutletById, insertOutlet, updateOutlet };
