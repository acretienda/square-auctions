// Cargar variables de entorno
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

// Crear app y servidor HTTP
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // en producción conviene restringir a tu dominio
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());

// Validar variables críticas
const requiredEnv = ["SQUARE_ACCESS_TOKEN", "SQUARE_ENVIRONMENT", "PUBLIC_BASE_URL"];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ ERROR: Falta la variable de entorno ${key}`);
    process.exit(1);
  }
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Square Auctions backend funcionando en Render!");
});

// Ejemplo de endpoint para crear una subasta
app.post("/auction", (req, res) => {
  const { title, startingBid } = req.body;

  if (!title || !startingBid) {
    return res.status(400).json({ error: "Faltan parámetros" });
  }

  const auction = {
    id: uuidv4(),
    title,
    startingBid,
    createdAt: new Date(),
  };

  // Notificar a todos los clientes conectados vía sockets
  io.emit("new-auction", auction);

  res.json({ success: true, auction });
});

// Configuración de Socket.IO
io.on("connection", (socket) => {
  console.log("🟢 Nuevo cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
