// vite.config.js
// Vite configuration — dev server + API proxy
// The proxy forwards /api/* requests to the backend so we avoid CORS issues
// during development. In production, you'd configure this at the server level.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api requests are forwarded to the Express backend
      "/api": {
        target:       "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
