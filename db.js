import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        starting_price NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Crear admin por defecto si no existe
    const res = await client.query('SELECT * FROM admins WHERE email=$1', ['admin@example.com']);
    if (res.rows.length === 0) {
      const hashed = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO admins (username, email, password) VALUES ($1, $2, $3)',
        ['admin', 'admin@example.com', hashed]
      );
      console.log('✅ Admin por defecto creado: admin@example.com / admin123');
    } else {
      console.log('🛠️ Admin ya existe');
    }
  } catch (err) {
    console.error('❌ Error al inicializar DB:', err);
  } finally {
    client.release();
  }
};

export default pool;
