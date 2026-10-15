/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SIGNUP_URL?: string;
  readonly VITE_ADMIN_LOGIN_URL?: string;
  /** Base URL for the Moonshot API, e.g. "http://localhost:3000". No trailing slash. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
