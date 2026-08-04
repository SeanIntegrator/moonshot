import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const previewPort = Number(process.env.PORT);
const previewPortConfig =
  Number.isFinite(previewPort) && previewPort > 0
    ? { port: previewPort, strictPort: true }
    : {};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Manifest lives in public/manifest.json so Apple + Android share one source.
      manifest: false,
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      workbox: {
        navigateFallback: '/index.html',
        // runtime-config.js is rewritten at container start — never pin a stale API URL.
        navigateFallbackDenylist: [/^\/runtime-config\.js$/],
        globIgnores: ['**/runtime-config.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/runtime-config.js',
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5176,
    strictPort: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
    ...previewPortConfig,
  },
  optimizeDeps: {
    include: ['@mui/material', '@emotion/react', '@emotion/styled'],
  },
});
