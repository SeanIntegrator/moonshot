import { config } from './lib/config.js';
import { createMoonshotHttpServer } from './create-moonshot-http-server.js';

const { httpServer } = createMoonshotHttpServer();

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(
    `@moonshot/api listening on 0.0.0.0:${config.port} (HTTP & Socket.io) — ${new Date().toISOString()}`,
  );
});
