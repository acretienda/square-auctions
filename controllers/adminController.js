const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_fallback_secret';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });

    const q = await pool.query('SELECT * FROM admins WHERE email=$1', [email]);
    if (q.rowCount === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

    const admin = q.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '4h' });
    res.json({ token });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const q = await pool.query('SELECT id, email, created_at FROM admins ORDER BY id');
    res.json(q.rows);
  } catch (err) {
    console.error('List admins error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [email, hashed]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Create admin error', err);
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM admins WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete admin error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
