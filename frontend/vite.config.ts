/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev the UI runs on :5173 and the engine on :8765; the proxy makes them one origin
// for the browser (REST, the MJPEG preview and the WebSocket).
const ENGINE = `http://127.0.0.1:${process.env.WAVESLIDE_PORT ?? "8765"}`;

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: ENGINE, changeOrigin: false },
      "/ws": { target: ENGINE, ws: true, changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
