const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing username/password' });

    const q = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (q.rowCount === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const admin = q.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
