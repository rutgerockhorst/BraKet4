import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/quantum/setup.ts"],
    include: ["test/**/*.spec.ts"],
  },
});
