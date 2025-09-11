import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Obtener lista de admins
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email FROM admins');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo admins' });
  }
});

export default router;
