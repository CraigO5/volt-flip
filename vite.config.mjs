import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    outDir: "dist/client",
    rollupOptions: {
      input: Object.fromEntries(["index.html", "home/index.html", "solver/index.html"].map(file => [file, fileURLToPath(new URL(file, import.meta.url))])),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    watch: { usePolling: true, interval: 250 },
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
