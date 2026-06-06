import { createMoonshotHttpServer } from './create-moonshot-http-server.js';

const PORT = Number(process.env.PORT) || 3000;

const { httpServer } = createMoonshotHttpServer();

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`@moonshot/api listening on 0.0.0.0:${PORT} (HTTP + Socket.io) — ${new Date().toISOString()}`);
});
