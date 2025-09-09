# Subastas con Square — listo para Render

App Node.js (Express + Socket.IO + PostgreSQL) que:
- Crea subastas de productos de tu **Catálogo de Square**.
- Pujas en tiempo real.
- Finaliza por tiempo o por nº mínimo/máximo de pujas.
- Genera **Payment Link** de Square para el ganador.
- Envía alertas por email por cada puja y notifica al ganador.

## Despliegue (Render)
1. Crea un repo con este proyecto y usa **Render → New → Blueprint** (usa `render.yaml`).
2. Variables de entorno requeridas (ver `.env.example`).
3. Start command: `node server.js` (ya en package.json).

## Rutas
- `/admin` (login, gestión de subastas)
- `/auction/:id` (página pública de pujas)
- `/webhooks/square` (webhook de pagos Square)

## Notas
- En producción, verifica la **firma del webhook**.
- Moneda por defecto: **EUR**.