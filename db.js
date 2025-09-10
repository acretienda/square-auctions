const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function ensureTable(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(200) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function ensurePasswordHashColumn(){
  const colRes = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='admins' AND column_name='password_hash'
  `);
  if (colRes.rowCount === 0){
    await pool.query(`ALTER TABLE admins ADD COLUMN password_hash TEXT;`);
    const oldCol = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='admins' AND column_name='password'
    `);
    if (oldCol.rowCount > 0){
      const rows = await pool.query('SELECT id, password FROM admins');
      for (const r of rows.rows){
        const hashed = await bcrypt.hash(r.password || 'admin123', 10);
        await pool.query('UPDATE admins SET password_hash=$1 WHERE id=$2', [hashed, r.id]);
      }
      console.log('✅ Migrated old password -> password_hash for existing admins');
    }
  }
}

async function createDefaultAdminIfEmpty(){
  const r = await pool.query('SELECT id FROM admins LIMIT 1');
  if (r.rowCount === 0){
    const defaultEmail = process.env.DEFAULT_ADMIN_USER || 'admin@example.com';
    const defaultPass = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const hashed = await bcrypt.hash(defaultPass, 10);
    await pool.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [defaultEmail, hashed]);
    console.log('🚀 Admin por defecto creado (email:', defaultEmail + ')');
  } else {
    console.log('✅ Admin ya existe, no se crea por defecto');
  }
}

async function initDB(){
  await ensureTable();
  await ensurePasswordHashColumn();
  await createDefaultAdminIfEmpty();
}

module.exports = { pool, initDB };
