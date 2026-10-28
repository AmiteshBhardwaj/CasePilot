/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CASEPILOT_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
