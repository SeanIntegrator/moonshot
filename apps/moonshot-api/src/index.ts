import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { API_VERSION_PREFIX } from '@moonshot/types';
import { authRouter } from './routes/auth.js';
import { cafeRouter } from './routes/cafe.js';
import { menuRouter } from './routes/menu.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`@moonshot/api listening on 0.0.0.0:${PORT}`);
});
