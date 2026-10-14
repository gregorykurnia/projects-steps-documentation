import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/** Refuses to touch anything that isn't the test database, then empties it. */
export async function resetTestDb() {
  if (process.env.APP_ENV !== "test") throw new Error("Refusing to reset a database outside APP_ENV=test");
  await db.execute(sql`truncate table step_usages, steps, projects restart identity cascade`);
}
