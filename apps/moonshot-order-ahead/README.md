# @moonshot/order-ahead

Customer order-ahead web app: **Vite + React + TypeScript + MUI**. Café branding maps `CafeTheme` from `@moonshot/types` into MUI `createTheme` + CSS variables (themes already wired). Multi-tenant routes live under `/:cafeSlug/*`.

Installable PWA: Web App Manifest + Apple meta tags + `vite-plugin-pwa` service worker (`display: standalone`). On iOS use **Share → Add to Home Screen** and launch from the home-screen icon to hide the Safari URL bar. The service worker uses **NetworkOnly** for `/runtime-config.js` (rewritten at container start) so a stale SW never pins an old API URL.
