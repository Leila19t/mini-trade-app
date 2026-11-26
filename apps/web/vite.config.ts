import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** The mock server (apps/mock-server). Same origin in production; proxied in dev. */
const MOCK_SERVER = "http://localhost:4000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": MOCK_SERVER,
      "/ws": { target: MOCK_SERVER, ws: true },
    },
  },
});
