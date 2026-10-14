// Loads docs/seed-data/*.txt through the real parser and the real save function.
// Safe to run twice: steps already in a project are skipped. Run `npm run db:seed:test` for the
// test database, `npm run db:seed` for the one in .env.local.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { projects } from "../src/db/schema";
import { addSteps, createProject } from "../src/db/mutations";
import { parseNotes } from "../src/lib/parse-notes";
import { slugify } from "../src/lib/slug";

// Notes files that don't start with a "Project name:" line need a name here.
const NAMES: Record<string, string> = { "deus-hcs-website": "DEUS HCS Website" };

async function main() {
  const dir = path.join(import.meta.dirname, "..", "docs", "seed-data");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
    const text = readFileSync(path.join(dir, file), "utf8");
    const base = file.replace(/\.txt$/, "");
    const name = parseNotes(text).projectName ?? NAMES[base] ?? base;
    let [project] = await db.select().from(projects).where(eq(projects.slug, slugify(name)));
    if (!project) project = await createProject({ name });
    const r = await addSteps(project.id, text);
    console.log(`${project.name}: added ${r.added.length}, already there ${r.skipped}, warnings ${r.warnings.length}`);
    for (const w of r.warnings) console.log(`  line ${w.line}: ${w.message}`);
  }
  await db.$client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
