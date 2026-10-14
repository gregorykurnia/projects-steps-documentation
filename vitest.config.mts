import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";

// Tests always run against the test database, never production.
config({ path: ".env.test", override: true });

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: true,
    fileParallelism: false,
  },
});
