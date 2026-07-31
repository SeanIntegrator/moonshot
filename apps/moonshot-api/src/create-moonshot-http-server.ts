import { createServer } from 'node:http';
import { API_VERSION_PREFIX } from '@moonshot/types';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createCorsOriginValidator, parseAllowedOrigins } from './lib/cors-origins.js';
import { attachCustomerSocketIO } from './realtime/customer-events.js';
import { registerCustomerSocketHandlers } from './realtime/customer-socket.js';
import { attachKdsSocketIO } from './realtime/kds-events.js';
import { registerKdsSocketHandlers } from './realtime/kds-socket.js';
import { errorHandler } from './middleware/error-handler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { cafeRouter } from './routes/cafe.js';
import { kdsRouter } from './routes/kds.js';
import { mediaRouter } from './routes/media.js';
import { menuRouter } from './routes/menu.js';
import { ordersRouter } from './routes/orders/index.js';
import { loyaltyRouter } from './routes/loyalty.js';
import { internalPosRouter } from './routes/internal-pos.js';
import { stripeWebhookRouter } from './routes/webhooks-stripe.js';
import { squareWebhookRouter } from './routes/webhooks-square.js';

export type MoonshotHttpPack = {
  app: express.Application;
  httpServer: ReturnType<typeof createServer>;
  io: Server;
};

/**
 * Single assembly point for HTTP + Socket.io (used by `index.ts` entrypoint and tests).
 */
export function createMoonshotHttpServer(): MoonshotHttpPack {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS);
  const corsOrigin = createCorsOriginValidator(allowedOrigins, isProduction);

  const app = express();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
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
      origin: corsOrigin,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Cafe-Slug', 'X-Cron-Secret'],
    }),
  );

  app.use(
    `${API_VERSION_PREFIX}/webhooks/stripe`,
    express.raw({ type: 'application/json', limit: '2mb' }),
    stripeWebhookRouter,
  );

  app.use(
    `${API_VERSION_PREFIX}/webhooks/square`,
    express.raw({ type: 'application/json', limit: '2mb' }),
    squareWebhookRouter,
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
  app.use(`${API_VERSION_PREFIX}/admin`, adminRouter);
  app.use(`${API_VERSION_PREFIX}/cafe`, cafeRouter);
  app.use(`${API_VERSION_PREFIX}/media`, mediaRouter);
  app.use(`${API_VERSION_PREFIX}/menu`, menuRouter);
  app.use(`${API_VERSION_PREFIX}/orders`, ordersRouter);
  app.use(`${API_VERSION_PREFIX}/loyalty`, loyaltyRouter);
  app.use(`${API_VERSION_PREFIX}/kds`, kdsRouter);
  app.use(`${API_VERSION_PREFIX}/internal/pos`, internalPosRouter);

  app.use(errorHandler);

  return { app, httpServer, io };
}
