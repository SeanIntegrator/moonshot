import { createServer } from 'node:http';
import { API_VERSION_PREFIX } from '@moonshot/types';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { attachCustomerSocketIO } from './realtime/customer-events.js';
import { registerCustomerSocketHandlers } from './realtime/customer-socket.js';
import { attachKdsSocketIO } from './realtime/kds-events.js';
import { registerKdsSocketHandlers } from './realtime/kds-socket.js';
import { authRouter } from './routes/auth.js';
import { cafeRouter } from './routes/cafe.js';
import { kdsRouter } from './routes/kds.js';
import { menuRouter } from './routes/menu.js';
import { ordersRouter } from './routes/orders.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});
attachKdsSocketIO(io);
registerKdsSocketHandlers(io);
attachCustomerSocketIO(io);
registerCustomerSocketHandlers(io);

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Cafe-Slug'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({
    service: '@moonshot/api',
    health: '/health',
    versionedHealth: `${API_VERSION_PREFIX}/health`,
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: '@moonshot/api' });
});

app.get(`${API_VERSION_PREFIX}/health`, (_req, res) => {
  res.json({ ok: true, service: '@moonshot/api', prefix: API_VERSION_PREFIX });
});

app.use(`${API_VERSION_PREFIX}/auth`, authRouter);
app.use(`${API_VERSION_PREFIX}/cafe`, cafeRouter);
app.use(`${API_VERSION_PREFIX}/menu`, menuRouter);
app.use(`${API_VERSION_PREFIX}/orders`, ordersRouter);
app.use(`${API_VERSION_PREFIX}/kds`, kdsRouter);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`@moonshot/api listening on 0.0.0.0:${PORT} (HTTP + Socket.io)`);
});
