// db.js
import pkg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pkg;

// Configuración de conexión a PostgreSQL (Render usa DATABASE_URL)
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initDB() {
  await client.connect();

  // Crear tabla de admins si no existe
  await client.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Verificar si ya existe el admin inicial
  const result = await client.query(
    `SELECT * FROM admins WHERE email = $1`,
    ['admin@example.com']
  );

  if (result.rows.length === 0) {
    // Hashear la contraseña por defecto
    const hashed = await bcrypt.hash('admin123', 10);

    // Insertar admin inicial
    await client.query(
      `INSERT INTO admins (username, email, password) VALUES ($1, $2, $3)`,
      ['admin', 'admin@example.com', hashed]
    );

    console.log("✅ Admin inicial creado (admin@example.com / admin123)");
  } else {
    console.log("ℹ️ Admin ya existe, no se crea uno nuevo");
  }
}

export default client;
