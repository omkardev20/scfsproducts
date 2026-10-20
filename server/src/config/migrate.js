// src/config/migrate.js
require('dotenv').config();
const { pool } = require('./db');

/**
 * Runs DDL migrations to initialize all tables on Neon PostgreSQL
 */
const migrate = async () => {
  const client = await pool?.connect?.();
  try {
    console.log('\n📦 Running Database Migrations on Neon PostgreSQL...\n');

    await client?.query?.('BEGIN');

    // 1. Outlets Table (Restaurant branches)
    await client?.query?.(`
      CREATE TABLE IF NOT EXISTS outlets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        branch_code VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Table "outlets" ready');

    // 2. Users Table (RBAC: SUPPLIER_ADMIN vs OUTLET_MANAGER)
    await client?.query?.(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('SUPPLIER_ADMIN', 'OUTLET_MANAGER')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    console.log('✅ Table "users" ready (with email index)');

    // 3. Categories Table
    await client?.query?.(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL
      );
    `);
    console.log('✅ Table "categories" ready');

    // 4. Products Table
    await client?.query?.(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id INT REFERENCES categories(id) ON DELETE SET NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        current_stock INT NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL DEFAULT 'unit',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    `);
    console.log('✅ Table "products" ready (with SKU index)');

    // 5. Orders Table
    await client?.query?.(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outlet_id UUID REFERENCES outlets(id) ON DELETE RESTRICT NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_orders_outlet ON orders(outlet_id);
    `);
    console.log('✅ Table "orders" ready');

    // 6. Order Items Table
    await client?.query?.(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
        product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(12, 2) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);
    console.log('✅ Table "order_items" ready');

    // 7. Inventory Logs Table (Audit trail)
    await client?.query?.(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
        change_quantity INT NOT NULL,
        reason VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Table "inventory_logs" ready');

    await client?.query?.('COMMIT');
    console.log('\n🎉 All 7 tables successfully created and verified on Neon PostgreSQL!\n');
  } catch (err) {
    await client?.query?.('ROLLBACK');
    console.error('❌ Migration failed:', err?.message ?? err);
    process?.exit?.(1);
  } finally {
    client?.release?.();
    await pool?.end?.();
  }
};

migrate();
