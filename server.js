require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

initDB().catch(err => {
  console.error('DB init error', err);
  process.exit(1);
});

app.get('/', (req, res) => res.send('Square Auctions backend (fixed admins)'));

app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('✅ Server running on port', PORT));
