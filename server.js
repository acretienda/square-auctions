require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// initialize DB and default admin
initDB().catch(err => {
  console.error('DB init error', err);
  process.exit(1);
});

app.get('/', (req, res) => res.send('Square Auctions backend (updated)'));

// admin routes
app.use('/api/admin', adminRoutes);

// example protected route
app.get('/api/admin/secure', authMiddleware, (req, res) => {
  res.json({ message: 'protected', user: req.user });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('✅ Server running on port', PORT));
