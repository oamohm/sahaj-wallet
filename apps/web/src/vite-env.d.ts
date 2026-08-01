/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACTIVE_BRAND?: string;
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
