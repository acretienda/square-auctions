// db.js
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    // Crear tabla admins si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      )
    `);

    // Verificar columnas (por si la tabla estaba creada a medias)
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='admins'`
    );
    const cols = res.rows.map((r) => r.column_name);

    if (!cols.includes("username")) {
      await client.query(`ALTER TABLE admins ADD COLUMN username TEXT UNIQUE NOT NULL DEFAULT 'admin'`);
      console.log("🛠️ Columna 'username' añadida a admins");
    }
    if (!cols.includes("email")) {
      await client.query(`ALTER TABLE admins ADD COLUMN email TEXT UNIQUE NOT NULL DEFAULT 'admin@example.com'`);
      console.log("🛠️ Columna 'email' añadida a admins");
    }
    if (!cols.includes("password_hash")) {
      await client.query(`ALTER TABLE admins ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
      console.log("🛠️ Columna 'password_hash' añadida a admins");
    }

    // Crear admin por defecto si la tabla está vacía
    const result = await client.query("SELECT COUNT(*) FROM admins");
    if (parseInt(result.rows[0].count) === 0) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      await client.query(
        `INSERT INTO admins (username, email, password_hash)
         VALUES ($1, $2, $3)`,
        ["admin", "admin@example.com", passwordHash]
      );
      console.log("✅ Admin por defecto creado (usuario=admin, password=admin123)");
    }
  } catch (err) {
    console.error("DB init error", err);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
