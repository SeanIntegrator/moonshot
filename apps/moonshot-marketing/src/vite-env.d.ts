/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SIGNUP_URL?: string;
  readonly VITE_ADMIN_LOGIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
