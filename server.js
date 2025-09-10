const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Configuración DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla admins si no existe
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);
    console.log("✅ Tabla admins verificada/creada");
  } catch (err) {
    console.error("❌ Error creando/verificando tabla admins", err);
  }
})();

// Ruta para login de administrador
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM admins WHERE username=$1", [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error("❌ Error en login", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// Inicializar server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
