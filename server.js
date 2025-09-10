const express = require("express");
const cors = require("cors");
const { initDB } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Rutas de ejemplo
app.get("/", (req, res) => {
  res.send("✅ Square Auctions Backend corriendo");
});

// Arrancar servidor solo si DB está lista
initDB().then(() => {
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("❌ Error al inicializar DB:", err);
  process.exit(1);
});
