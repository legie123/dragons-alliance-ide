import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve("src/main/index.ts"),
          // the pty-host runs in a dedicated utilityProcess (node-pty lives here,
          // never in the main process) — built alongside main → out/main/host.js
          host: resolve("src/pty-host/host.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: { input: { index: resolve("src/preload/index.ts") } },
    },
  },
  renderer: {
    root: "src/renderer",
    resolve: { alias: { "@shared": resolve("src/shared") } },
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 6000,
      rollupOptions: { input: { index: resolve("src/renderer/index.html") } },
    },
  },
});
