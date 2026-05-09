import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// PA #2.5a — Inline `process.env.VERCEL_ENV` into the client bundle so the
// anti-tamper-gate helper can distinguish Vercel preview from production at
// runtime. Vercel sets VERCEL_ENV at build time on every deploy. This
// `define` block embeds that exact value as a string literal in the bundle,
// which is the only way client-side code can see a server-only env var.
// NODE_ENV is intentionally NOT redefined here — Vite manages it.
const vercelEnvDefine = JSON.stringify(process.env.VERCEL_ENV ?? '');

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  define: {
    'process.env.VERCEL_ENV': vercelEnvDefine,
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});