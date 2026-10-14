import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { defineConfig } from "@playwright/test";

const PORT = 3187; // not 3100: other projects on this machine use it

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1280, height: 900 } },
  webServer: {
    // The app under test reads the test database, never production. `exec` makes the server
    // the process Playwright owns, so it is stopped when the run ends.
    command: `npm run build && exec ./node_modules/.bin/next start -p ${PORT}`,
    env: { ...(process.env as Record<string, string>), ...parse(readFileSync(".env.test")) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
