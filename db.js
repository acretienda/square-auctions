const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const runMigrations = require("./migrations");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    await runMigrations(client);

    // Crear admin por defecto si no existe
    const res = await client.query("SELECT COUNT(*) FROM admins");
    if (parseInt(res.rows[0].count) === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await client.query(
        `INSERT INTO admins (username, email, password_hash) 
         VALUES ($1, $2, $3)`,
        ["admin", "admin@example.com", hash]
      );
      console.log("👤 Admin por defecto creado: admin / admin123");
    }
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
