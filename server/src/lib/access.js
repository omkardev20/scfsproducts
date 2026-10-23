// src/lib/access.js
// Reads the logged-in user off the JWT payload.
// request.user is set by the authenticate hook. These helpers keep every
// route from digging into that object with a different fallback.

const { AppError } = require('./appError');

/** Supplier staff who can manage the whole catalog, every outlet, and every order. */
const isAdmin = (user) => (user?.role ?? null) === 'SUPPLIER_ADMIN';

/** User id stored in the token as `sub` (JWT subject). */
const actorId = (user) => user?.sub ?? null;

/** Outlet id for an outlet manager. Admins usually have null here. */
const ownOutletId = (user) => user?.outletId ?? null;

/**
 * Stops a request that is not a supplier admin.
 * @param {Record<string, unknown> | null | undefined} user
 */
const assertAdmin = (user) => {
  if (!isAdmin(user)) {
    throw new AppError(403, 'Only a supplier admin can do this');
  }
};

module.exports = { isAdmin, actorId, ownOutletId, assertAdmin };
