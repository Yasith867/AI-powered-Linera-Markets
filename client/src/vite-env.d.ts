/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LINERA_APP_ID: string;
  readonly VITE_LINERA_CHAIN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
