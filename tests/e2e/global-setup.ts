import { execSync } from "node:child_process";
import { config } from "dotenv";

// Tests always run against the test database: empty it, then load both seed projects.
export default async function globalSetup() {
  config({ path: ".env.test", override: true });
  if (process.env.APP_ENV !== "test") throw new Error("Refusing to run e2e outside APP_ENV=test");
  const { resetTestDb } = await import("../unit/helpers/db");
  await resetTestDb();
  execSync("npx dotenv run -q -f .env.test -- tsx scripts/seed.ts", { stdio: "inherit" });
  const { db } = await import("../../src/db/client");
  await db.$client.end();
}
