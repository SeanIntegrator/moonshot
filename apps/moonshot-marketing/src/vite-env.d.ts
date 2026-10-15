/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SIGNUP_URL?: string;
  readonly VITE_ADMIN_LOGIN_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
