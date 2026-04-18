// vite.config.js
import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // ── Dev server proxy ────────────────────────────────────────────────────────
  // In development: requests to /api are forwarded to Express on port 5000.
  // In production:  VITE_API_URL points directly to the Render backend URL.
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target:       "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },

  // ── Production build settings ───────────────────────────────────────────────
  build: {
    outDir:       "dist",
    sourcemap:    false,      // Disable for smaller bundle
    chunkSizeWarningLimit: 1000,
  },
}));
