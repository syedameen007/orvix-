import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@orvix/types": new URL("./packages/types/src/index.ts", import.meta.url).pathname,
      "@orvix/utils": new URL("./packages/utils/src/index.ts", import.meta.url).pathname
    }
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
