import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as PgPool } from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzlePg<typeof schema>>;

function connect(): Db {
  const url = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_POOLED is not set");
  // Neon connections use its serverless driver; anything else (local Postgres) uses plain pg.
  if (new URL(url).hostname.endsWith(".neon.tech")) {
    neonConfig.webSocketConstructor = ws;
    return drizzleNeon(new NeonPool({ connectionString: url }), { schema }) as unknown as Db;
  }
  return drizzlePg(new PgPool({ connectionString: url }), { schema });
}

const globalForDb = globalThis as unknown as { __db?: Db };

// One pool per process, kept across dev hot reloads. Connects on first use, not on import,
// so `next build` doesn't need DATABASE_URL (pages read the database at request time).
export const db: Db = new Proxy({} as Db, {
  get(_, prop) {
    const real = (globalForDb.__db ??= connect());
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
export { schema };
