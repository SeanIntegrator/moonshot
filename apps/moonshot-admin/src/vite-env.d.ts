/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ORDER_AHEAD_BASE_URL?: string;
  readonly VITE_KDS_BASE_URL?: string;
  readonly VITE_MARKETING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
