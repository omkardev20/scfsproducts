// src/services/authService.js
// Signup and login rules. Routes only pass the body and a function that signs a JWT.
// The password is hashed here and is never returned.

const bcrypt = require('bcryptjs');
const { AppError } = require('../lib/appError');
const { one } = require('../lib/sql');
const { findUserByEmail, insertUser } = require('../repositories/userRepository');

const ROLES = ['SUPPLIER_ADMIN', 'OUTLET_MANAGER'];

/**
 * Drops the password hash before anything is sent to the client.
 * @param {Record<string, unknown> | null} user
 */
const publicUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? null,
    outletId: user.outletId ?? null,
    email: user.email ?? '',
    fullName: user.fullName ?? '',
    role: user.role ?? null,
    createdAt: user.createdAt ?? null,
  };
};

/**
 * Builds the object stored inside the JWT.
 * `sub` is the user id. The other fields let routes authorize without a second query.
 * @param {Record<string, unknown> | null} user
 */
const tokenPayload = (user) => ({
  sub: user?.id ?? null,
  email: user?.email ?? null,
  role: user?.role ?? null,
  outletId: user?.outletId ?? null,
  fullName: user?.fullName ?? null,
});

/**
 * Checks the signup body and creates the user.
 * An outlet manager must point at a real outlet. An admin must not.
 * @param {Record<string, unknown> | null | undefined} input
 */
const signup = async (input) => {
  const email = String(input?.email ?? '').trim().toLowerCase();
  const password = String(input?.password ?? '');
  const fullName = String(input?.fullName ?? '').trim();
  const role = input?.role ?? null;
  const outletId = input?.outletId ?? null;

  if (!email.includes('@')) {
    throw new AppError(400, 'A valid email is required');
  }
  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters');
  }
  if (!fullName) {
    throw new AppError(400, 'Full name is required');
  }
  if (!ROLES.includes(role)) {
    throw new AppError(400, 'Role must be SUPPLIER_ADMIN or OUTLET_MANAGER');
  }
  if (role === 'OUTLET_MANAGER' && !outletId) {
    throw new AppError(400, 'An outlet manager must belong to an outlet');
  }
  if (role === 'SUPPLIER_ADMIN' && outletId) {
    throw new AppError(400, 'A supplier admin is not tied to one outlet');
  }

  // Confirm the outlet before insert so the error names the problem.
  if (role === 'OUTLET_MANAGER') {
    const outlet = await one('SELECT id FROM outlets WHERE id = $1', [outletId]);
    if (!outlet) {
      throw new AppError(400, 'Outlet was not found');
    }
  }

  // 10 is the bcrypt cost. Higher is slower and harder to brute-force.
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await insertUser({
    outletId: role === 'OUTLET_MANAGER' ? outletId : null,
    email,
    passwordHash,
    fullName,
    role,
  });

  return publicUser(created);
};

/**
 * Checks email and password. On success the route signs tokenPayload(user).
 * The same error is used for a missing user and a bad password so callers
 * cannot learn which emails exist.
 * @param {Record<string, unknown> | null | undefined} input
 */
const login = async (input) => {
  const email = String(input?.email ?? '').trim().toLowerCase();
  const password = String(input?.password ?? '');
  const user = await findUserByEmail(email, true);
  const hash = user?.passwordHash ?? '';
  // compare against a real hash only. A missing user still takes the failure path.
  const matches = hash ? await bcrypt.compare(password, hash) : false;

  if (!user || !matches) {
    throw new AppError(401, 'Email or password is incorrect');
  }

  return publicUser(user);
};

/**
 * Shared success body for signup and login: the token plus the public user.
 * @param {Record<string, unknown> | null} user
 * @param {(payload: Record<string, unknown>) => string | null | undefined} sign
 */
const issueSession = (user, sign) => {
  const token = sign?.(tokenPayload(user)) ?? null;
  if (!token) {
    throw new AppError(500, 'Could not create a login token');
  }

  return {
    token,
    user: user ?? null,
  };
};

module.exports = { signup, login, issueSession, publicUser };
