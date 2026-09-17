import { defineConfig } from "vite";
import { quantumForgeVitePlugin } from "quantum-forge/vite-plugin";

export default defineConfig({
  base: "./",
  plugins: [quantumForgeVitePlugin()],
  build: {
    rollupOptions: {
      external: [/quantum-forge-web-api/],
    },
  },
});
