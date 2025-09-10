const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Función para inicializar la DB
async function initDB() {
  try {
    // 1. Crear tabla admins si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Verificar y añadir columnas si faltan
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins';
    `);

    const columns = res.rows.map(r => r.column_name);

    if (!columns.includes("email")) {
      await pool.query(`ALTER TABLE admins ADD COLUMN email TEXT UNIQUE;`);
      console.log("🛠️ Columna 'email' añadida a admins");
    }

    if (!columns.includes("password_hash")) {
      await pool.query(`ALTER TABLE admins ADD COLUMN password_hash TEXT;`);
      console.log("🛠️ Columna 'password_hash' añadida a admins");
    }

    // 3. Crear admin por defecto si no existe
    const existing = await pool.query("SELECT * FROM admins LIMIT 1;");
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await pool.query(
        "INSERT INTO admins (email, password_hash) VALUES ($1, $2)",
        ["admin@example.com", hash]
      );
      console.log("✅ Admin por defecto creado: admin@example.com / admin123");
    }
  } catch (err) {
    console.error("DB init error", err);
  }
}

module.exports = { pool, initDB };
