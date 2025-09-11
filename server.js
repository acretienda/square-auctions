import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import initDB from "./db.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Square Auctions backend activo ✅");
});

// Inicializar DB y arrancar server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server corriendo en puerto ${PORT}`);
  });
}).catch(err => {
  console.error("❌ Error al inicializar DB:", err);
});
