import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const previewPort = Number(process.env.PORT);
const previewPortConfig =
  Number.isFinite(previewPort) && previewPort > 0
    ? { port: previewPort, strictPort: true }
    : {};

export default defineConfig({
  plugins: [react()],
  preview: {
    host: true,
    allowedHosts: true,
    ...previewPortConfig,
  },
});
