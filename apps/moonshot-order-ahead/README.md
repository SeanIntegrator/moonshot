# @moonshot/order-ahead

Customer order-ahead web app: **Vite + React + TypeScript + MUI**. Café branding maps `CafeTheme` from `@moonshot/types` into MUI `createTheme` + CSS variables (themes already wired). Multi-tenant routes live under `/:cafeSlug/*`.

Installable PWA: Web App Manifest (`display: fullscreen`, falling back to `standalone`) + Apple meta tags + `vite-plugin-pwa` service worker. Chromium shows an in-app Install bar once `beforeinstallprompt` fires (that needs the service worker, including in `pnpm dev`). On iOS use **Share → Add to Home Screen** and launch from the home-screen icon — Safari has no install prompt. The service worker uses **NetworkOnly** for `/runtime-config.js` (rewritten at container start) so a stale SW never pins an old API URL.
