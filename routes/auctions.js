import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Crear subasta
router.post('/', async (req, res) => {
  const { title, description, starting_price } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO auctions (title, description, starting_price) VALUES ($1,$2,$3) RETURNING *',
      [title, description, starting_price]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creando subasta' });
  }
});

// Obtener subastas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM auctions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo subastas' });
  }
});

export default router;
