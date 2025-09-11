import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminsRoutes from './routes/admins.js';
import auctionsRoutes from './routes/auctions.js';
import { initDB } from './db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/auctions', auctionsRoutes);

// Iniciar servidor
app.listen(PORT, async () => {
  await initDB();
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
