import express from "express";
import cors from "cors";
import initDB from "./db.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas principales
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Square Auctions backend (admins OK)");
});

// Inicializar base de datos y levantar servidor
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("❌ Error iniciando DB:", err);
});
