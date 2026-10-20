// src/config/db.js
const { Pool } = require('pg');

// Safe null-check for cloud provider detection
const isCloud = process.env.DATABASE_URL?.includes('neon.tech') ?? false;

// Create a PostgreSQL connection pool using environment variables with defensive fallbacks
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isCloud ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME ?? 'scfproducts_db',
        user: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
      }
);

// Log unexpected errors on idle pool clients with safe null checking
pool?.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err?.message ?? err);
});

// Helper function to test and verify database connection safely
const connectDB = async () => {
  const client = await pool?.connect();
  try {
    const res = await client?.query('SELECT current_database() as db_name, version()');
    return res?.rows?.[0] ?? null;
  } finally {
    client?.release?.();
  }
};

module.exports = { pool, connectDB };
