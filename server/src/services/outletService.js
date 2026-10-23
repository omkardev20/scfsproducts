// src/services/outletService.js
// Who may see or change an outlet.
// Admins see every branch. An outlet manager sees only the branch on their token.

const { AppError } = require('../lib/appError');
const { readPage } = require('../lib/page');
const { isAdmin, ownOutletId, assertAdmin } = require('../lib/access');
const { listOutlets, findOutletById, insertOutlet, updateOutlet } = require('../repositories/outletRepository');

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} query
 */
const list = async (user, query) => {
  const page = readPage(query);
  // A manager is locked to their own outlet. An admin passes null and sees all.
  const outletId = isAdmin(user) ? null : (ownOutletId(user) ?? null);

  if (!isAdmin(user) && !outletId) {
    throw new AppError(403, 'Your account is not linked to an outlet');
  }

  const result = await listOutlets({ ...page, outletId });
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
  const outlet = await findOutletById(id);
  if (!outlet) {
    throw new AppError(404, 'Outlet was not found');
  }

  if (!isAdmin(user) && outlet.id !== ownOutletId(user)) {
    throw new AppError(403, 'You can only view your own outlet');
  }

  return outlet;
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {Record<string, unknown> | null | undefined} input
 */
const create = async (user, input) => {
  assertAdmin(user);

  const name = String(input?.name ?? '').trim();
  const branchCode = String(input?.branchCode ?? '').trim();
  if (!name) {
    throw new AppError(400, 'Outlet name is required');
  }
  if (!branchCode) {
    throw new AppError(400, 'Branch code is required');
  }

  return insertOutlet({
    name,
    branchCode,
    address: input?.address ?? null,
    phone: input?.phone ?? null,
  });
};

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {string} id
 * @param {Record<string, unknown> | null | undefined} input
 */
const update = async (user, id, input) => {
  assertAdmin(user);

  const patch = {};
  if (input?.name !== undefined) {
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new AppError(400, 'Outlet name cannot be empty');
    }
    patch.name = name;
  }
  if (input?.branchCode !== undefined) {
    const branchCode = String(input.branchCode ?? '').trim();
    if (!branchCode) {
      throw new AppError(400, 'Branch code cannot be empty');
    }
    patch.branchCode = branchCode;
  }
  if (input?.address !== undefined) {
    patch.address = input.address ?? null;
  }
  if (input?.phone !== undefined) {
    patch.phone = input.phone ?? null;
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError(400, 'Provide at least one field to update');
  }

  const updated = await updateOutlet(id, patch);
  if (!updated) {
    throw new AppError(404, 'Outlet was not found');
  }
  return updated;
};

module.exports = { list, getById, create, update };
