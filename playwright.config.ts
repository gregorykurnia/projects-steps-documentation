import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    // The app under test reads the test database, never production.
    command: `npx dotenv run -q -f .env.test -- sh -c "npm run build && npx next start -p ${PORT}"`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
