const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB(){
  // create admins table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // if no admin exists, create default
  const r = await pool.query('SELECT id FROM admins LIMIT 1');
  if (r.rowCount === 0){
    const defaultUser = process.env.DEFAULT_ADMIN_USER || 'admin';
    const defaultPass = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';
    const hashed = await bcrypt.hash(defaultPass, 10);
    await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [defaultUser, hashed]);
    console.log('✅ Default admin created:', defaultUser);
  } else {
    console.log('✅ Admin table OK (has rows)');
  }
}

module.exports = { pool, initDB };
