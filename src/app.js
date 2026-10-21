// ─────────────────────────────────────────────
// VirtualShop API — Configuração da app Express
// ─────────────────────────────────────────────
const express = require('express');
const path = require('node:path');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { pool } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const categoryRoutes = require('./modules/categories/category.routes');
const productRoutes = require('./modules/products/product.routes');
const cartRoutes = require('./modules/cart/cart.routes');
const orderRoutes = require('./modules/orders/order.routes');
const favoriteRoutes = require('./modules/favorites/favorites.routes');
const userRoutes = require('./modules/users/users.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');

const app = express();

// ── Segurança / infra base ───────────────────
// ── Segurança / infra base ───────────────────
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      const rejectOrigin = (message) => {
        const error = new Error(message);
        error.statusCode = 403;
        return callback(error);
      };

      if (env.nodeEnv === 'development') {
        // Permite pedidos sem Origin (Postman, apps mobile, curl)
        if (!origin) return callback(null, true);

        const localhostOrigin = origin.match(/^https?:\/\/(localhost|127\.0\.0\.1):(\d{1,5})$/);
        if (localhostOrigin && Number(localhostOrigin[2]) <= 65535) {
          return callback(null, true);
        }

        if (env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }

        return rejectOrigin(`Origem não permitida: ${origin}`);
      }

      if (env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return rejectOrigin(`Origem não permitida: ${origin || 'ausência de Origin'}`);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { fallthrough: false, maxAge: '1d' }));

// ── Healthcheck ───────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', message: 'VirtualShop API operacional.' });
});

app.get('/api/health/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, status: 'ready' });
  } catch (err) {
    res.status(503).json({ success: false, status: 'not_ready' });
  }
});

// ── Rotas ──────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 + erros ────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
