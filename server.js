
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const ejsLayouts = require('express-ejs-layouts');
const { Server } = require('socket.io');
const http = require('http');
const { Client, Environment } = require('@square/square');
const { v4: uuidv4 } = require('uuid');
const pg = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

// Basic hardening
app.disable('x-powered-by');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.layout = true;
app.use(ejsLayouts);

// Sessions (memory store for simplicity)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Database
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDb() {
  await pool.query(`
  create table if not exists users (
    id uuid primary key,
    name text,
    email text unique
  );
  create table if not exists auctions (
    id uuid primary key,
    title text not null,
    catalog_object_id text not null,
    start_price_cents integer not null,
    start_time timestamptz not null default now(),
    duration_seconds integer not null,
    min_bids integer,
    max_bids integer,
    status text not null default 'live',
    winner_user_id uuid,
    winning_bid_id uuid,
    payment_link_url text,
    winner_email text
  );
  create table if not exists bids (
    id uuid primary key,
    auction_id uuid not null references auctions(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    amount_cents integer not null,
    created_at timestamptz not null default now()
  );
  create index if not exists bids_auction_idx on bids(auction_id);
  `);
}
initDb().catch(console.error);

// Email (SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail(to, subject, html) {
  if (!to) return;
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
  } catch (e) {
    console.error('Email error', e);
  }
}

// Square SDK
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
    ? Environment.Production
    : Environment.Sandbox
});

async function listCatalogItems() {
  try {
    const resp = await squareClient.catalogApi.listCatalog(undefined, undefined, 'ITEM');
    const items = (resp.result.objects || []).map(o => ({ id: o.id, name: o.itemData?.name || o.id }));
    return items;
  } catch (e) {
    console.error('Square listCatalogItems', e);
    return [];
  }
}

async function endAuctionAndCreatePaymentLink(auctionId) {
  // Determine winner
  const { rows: bids } = await pool.query(
    'select b.*, u.email, u.name from bids b join users u on b.user_id = u.id where auction_id=$1 order by amount_cents desc, created_at asc',
    [auctionId]
  );
  const { rows: [auction] } = await pool.query('select * from auctions where id=$1', [auctionId]);
  if (!auction || auction.status === 'ended' || auction.status === 'paid') return null;

  let winnerEmail = null;
  let winningBid = null;
  if (bids.length > 0) {
    winningBid = bids[0];
    winnerEmail = winningBid.email;
  }

  let paymentLinkUrl = null;
  if (winningBid) {
    // Create Payment Link (Square Checkout API)
    const idempotencyKey = uuidv4();
    const locationId = process.env.SQUARE_LOCATION_ID;
    const title = auction.title;
    const amount = winningBid.amount_cents;
    const currency = 'EUR'; // ajusta a tu moneda
    try {
      const { result } = await squareClient.checkoutApi.createPaymentLink({
        idempotencyKey,
        order: {
          locationId,
          lineItems: [{
            name: title,
            quantity: '1',
            basePriceMoney: { amount, currency }
          }]
        },
        checkoutOptions: {
          redirectUrl: `${BASE_URL}/thanks?auction=${auctionId}`
        }
      });
      paymentLinkUrl = result.paymentLink?.url || null;
    } catch (e) {
      console.error('Square createPaymentLink', e);
    }
  }

  await pool.query('update auctions set status=$2, winner_email=$3, winning_bid_id=$4, payment_link_url=$5 where id=$1',
    [auctionId, 'ended', winnerEmail, winningBid?.id || null, paymentLinkUrl]);
  
  io.to(auctionId).emit('auction-ended', { auctionId });
  if (winnerEmail && paymentLinkUrl) {
    await sendEmail(winnerEmail, '¡Has ganado la subasta!', `
      <p>Enhorabuena, has ganado la subasta <strong>${auction.title}</strong> por <strong>€${(winningBid.amount_cents/100).toFixed(2)}</strong>.</p>
      <p>Puedes pagar aquí: <a href="${paymentLinkUrl}">${paymentLinkUrl}</a></p>
    `);
  }
  return { winnerEmail, paymentLinkUrl };
}

// Auth middleware
function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.redirect('/admin/login');
}

// Routes
app.get('/', (req, res) => res.redirect('/admin'));

// Admin login/logout
app.get('/admin/login', (req,res)=> res.render('admin-login', { title: 'Admin — Login', error: null }));
app.post('/admin/login', (req,res)=>{
  if ((req.body.password || '') === (process.env.ADMIN_PASSWORD || '')) {
    req.session.isAdmin = true;
    return res.redirect('/admin/auctions');
  }
  return res.status(401).render('admin-login', { title: 'Admin — Login', error:'Contraseña incorrecta' });
});
app.post('/admin/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/admin/login'));
});

// Admin list/create
app.get('/admin/auctions', requireAdmin, async (req,res)=>{
  const { rows: auctions } = await pool.query(`
    select a.*, (select count(*)::int from bids b where b.auction_id=a.id) as bid_count
    from auctions a order by a.start_time desc
  `);
  const catalogItems = await listCatalogItems();
  res.render('admin-auctions', { title:'Panel Admin — Subastas', auctions, catalogItems });
});

app.post('/admin/auctions', requireAdmin, async (req,res)=>{
  const { title, catalog_object_id, start_price_eur, duration_seconds, min_bids, max_bids, start_time_iso } = req.body || {};
  const id = uuidv4();
  const start_price_cents = Math.round(parseFloat(start_price_eur) * 100);
  const dur = parseInt(duration_seconds || '60', 10);
  const minb = min_bids ? parseInt(min_bids, 10) : null;
  const maxb = max_bids ? parseInt(max_bids, 10) : null;
  const start_time = start_time_iso ? new Date(start_time_iso) : new Date();
  await pool.query(`insert into auctions(id,title,catalog_object_id,start_price_cents,duration_seconds,min_bids,max_bids,start_time,status)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, title, catalog_object_id, start_price_cents, dur, minb, maxb, start_time, 'live']);
  res.redirect('/admin/auctions');
});

app.get('/admin/auctions/:id/end', requireAdmin, async (req,res)=>{
  await endAuctionAndCreatePaymentLink(req.params.id).catch(console.error);
  res.redirect('/admin/auctions');
});

// Public auction page
app.get('/auction/:id', async (req,res)=>{
  const { rows: [auction] } = await pool.query('select * from auctions where id=$1', [req.params.id]);
  if (!auction) return res.status(404).send('No encontrada');
  const { rows: bids } = await pool.query('select b.*, u.name, u.email from bids b join users u on b.user_id = u.id where b.auction_id=$1 order by amount_cents desc, created_at asc', [auction.id]);
  const top = bids[0];
  const isWinner = (auction.status !== 'live' && auction.winner_email && req.query.email && (req.query.email.toLowerCase() === auction.winner_email.toLowerCase()));
  res.render('auction', {
    title: auction.title,
    auction,
    bids,
    topBid: top ? top.amount_cents : auction.start_price_cents,
    topBidder: top ? (top.name || top.email) : null,
    winner_email: auction.winner_email,
    isWinner
  });
});

// Place a bid
app.post('/auction/:id/bid', async (req,res)=>{
  const { name, email, amount_eur } = req.body || {};
  if (!name || !email || !amount_eur) return res.status(400).json({ error: 'Datos incompletos' });
  const amount_cents = Math.round(parseFloat(amount_eur) * 100);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [auction] } = await client.query('select * from auctions where id=$1 for update', [req.params.id]);
    if (!auction) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Subasta no encontrada' }); }
    if (auction.status !== 'live') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'La subasta no está activa' }); }
    const now = new Date();
    const endsAt = new Date(new Date(auction.start_time).getTime() + auction.duration_seconds*1000);
    if (now > endsAt) {
      await client.query('update auctions set status=$2 where id=$1', [auction.id, 'ended']);
      await client.query('COMMIT');
      io.to(auction.id).emit('auction-ended', { auctionId: auction.id });
      return res.status(400).json({ error: 'La subasta ha finalizado' });
    }
    const { rows: topRows } = await client.query('select amount_cents from bids where auction_id=$1 order by amount_cents desc, created_at asc limit 1', [auction.id]);
    const currentTop = topRows[0]?.amount_cents || auction.start_price_cents;
    if (amount_cents <= currentTop) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'La puja debe ser mayor que la actual' }); }
    // upsert user
    let userId = uuidv4();
    const { rows: [u] } = await client.query('insert into users(id,name,email) values($1,$2,$3) on conflict (email) do update set name=EXCLUDED.name returning id', [userId, name, email.toLowerCase()]);
    userId = u.id;
    const bidId = uuidv4();
    await client.query('insert into bids(id, auction_id, user_id, amount_cents) values($1,$2,$3,$4)', [bidId, auction.id, userId, amount_cents]);
    // Count bids
    const { rows: [countRow] } = await client.query('select count(*)::int as c from bids where auction_id=$1', [auction.id]);
    const bidCount = countRow.c;
    await client.query('COMMIT');
    io.to(auction.id).emit('bid-update', { auctionId: auction.id, topBid: amount_cents, topBidder: name, bidCount });
    // Alerts
    await sendEmail(process.env.ALERT_EMAIL_TO, 'Nueva puja', `<p>${name} (${email}) ha pujado €${(amount_cents/100).toFixed(2)} en la subasta "${auction.title}".</p>`);
    // Check end conditions (min/max bids)
    if ((auction.max_bids && bidCount >= auction.max_bids)) {
      await endAuctionAndCreatePaymentLink(auction.id);
    } else if (auction.min_bids && bidCount >= auction.min_bids) {
      const endsAt2 = new Date(new Date(auction.start_time).getTime() + auction.duration_seconds*1000);
      if (new Date() > endsAt2) {
        await endAuctionAndCreatePaymentLink(auction.id);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    client.release();
  }
});

// Webhooks (Square: payment.updated) - mark auction as paid
app.post('/webhooks/square', express.json({ type: '*/*' }), async (req,res)=>{
  // TODO: verifica la firma en producción
  const event = req.body;
  try {
    if (event?.type === 'payment.updated' || event?.type === 'payment.created') {
      const payment = event.data?.object?.payment;
      if (payment?.status === 'COMPLETED') {
        // Aquí podrías conciliar por orderId o metadata. Simplificado.
        const { rows: ended } = await pool.query(`select id from auctions where status='ended' and payment_link_url is not null limit 1`);
        if (ended[0]) {
          await pool.query('update auctions set status=$2 where id=$1', [ended[0].id, 'paid']);
        }
      }
    }
  } catch (e) { console.error('webhook error', e); }
  res.json({ ok: true });
});

// Socket.IO
io.on('connection', (socket)=>{
  socket.on('join-auction', ({ auctionId })=>{
    socket.join(auctionId);
  });
});

// Background timer to auto-end auctions whose time elapsed
setInterval(async ()=>{
  try {
    const { rows: live } = await pool.query('select * from auctions where status=$1', ['live']);
    for (const a of live) {
      const endsAt = new Date(new Date(a.start_time).getTime() + a.duration_seconds*1000);
      if (new Date() > endsAt) {
        await endAuctionAndCreatePaymentLink(a.id);
      }
    }
  } catch (e) {
    console.error('timer', e);
  }
}, 5000);

server.listen(PORT, ()=>{
  console.log('Server listening on', PORT);
});
