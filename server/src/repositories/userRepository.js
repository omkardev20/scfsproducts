// src/repositories/userRepository.js
// The only file that reads or writes the users table.
// password_hash leaves this file only when login needs to compare it.

const { one } = require('../lib/sql');
const { toIso } = require('../lib/dates');

/**
 * Maps a database row to the camelCase object the rest of the app uses.
 * The password hash is included only for the login check, never for a response.
 * @param {Record<string, unknown> | null} row
 * @param {boolean} [includePassword]
 */
const mapUser = (row, includePassword = false) => {
  if (!row) {
    return null;
  }

  const user = {
    id: row.id ?? null,
    outletId: row.outlet_id ?? null,
    email: row.email ?? '',
    fullName: row.full_name ?? '',
    role: row.role ?? null,
    createdAt: toIso(row.created_at),
  };

  if (includePassword) {
    user.passwordHash = row.password_hash ?? null;
  }

  return user;
};

/**
 * Looks up one user by email. Email is stored lowercase.
 * @param {string} email
 * @param {boolean} [includePassword]
 */
const findUserByEmail = async (email, includePassword = false) => {
  const row = await one(
    `SELECT id, outlet_id, email, password_hash, full_name, role, created_at
     FROM users
     WHERE email = $1`,
    [email ?? null]
  );
  return mapUser(row, includePassword);
};

/**
 * Inserts a user. The caller must already have hashed the password.
 * @param {{ outletId: string | null, email: string, passwordHash: string, fullName: string, role: string }} input
 */
const insertUser = async (input) => {
  const row = await one(
    `INSERT INTO users (outlet_id, email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, outlet_id, email, full_name, role, created_at`,
    [
      input?.outletId ?? null,
      input?.email ?? null,
      input?.passwordHash ?? null,
      input?.fullName ?? null,
      input?.role ?? null,
    ]
  );
  return mapUser(row, false);
};

module.exports = { findUserByEmail, insertUser };
