import { revalidatePath } from "next/cache";
import { addStepsToNamedProject } from "@/db/mutations";
import { checkIngestKey, ingestBodySchema } from "@/lib/ingest";

// Steps sent by autorun (docs/PLAN.md 2.4). Everything else on the site is written through Server Actions.

function refuse(request: Request): Response | null {
  const check = checkIngestKey(request.headers.get("authorization"), process.env.INGEST_KEY);
  if (check === "off") return Response.json({ error: "Sending steps is off: INGEST_KEY isn't set" }, { status: 503 });
  if (check === "wrong") return Response.json({ error: "Wrong or missing key" }, { status: 401 });
  return null;
}

/** Checks the key only, so autorun's setup can test it without adding anything. */
export async function GET(request: Request) {
  return refuse(request) ?? Response.json({ ok: true });
}

export async function POST(request: Request) {
  const refused = refuse(request);
  if (refused) return refused;

  const body = ingestBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
  }

  const result = await addStepsToNamedProject(body.data.project, body.data.text);
  revalidatePath("/");
  revalidatePath("/p/[slug]", "layout");
  return Response.json({
    project: result.project.slug,
    added: result.added.length,
    skipped: result.skipped,
    warnings: result.warnings,
  });
}
