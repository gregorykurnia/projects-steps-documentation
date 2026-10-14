import { and, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { projects, stepUsages, steps } from "./schema";
import { parseNotes, type ParseWarning } from "@/lib/parse-notes";
import { knownFingerprints, stepFingerprint } from "@/lib/fingerprint";
import { slugify } from "@/lib/slug";
import {
  pasteEditsSchema,
  pasteTextSchema,
  projectFieldsSchema,
  stepFieldsSchema,
  type PasteEdits,
  type ProjectFieldsInput,
  type StepFields,
  type StepFieldsInput,
} from "@/lib/schemas";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const touchProject = (tx: Tx, projectId: string) =>
  tx.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));

async function insertStep(tx: Tx, projectId: string, position: number, f: StepFields, sourceText: string | null) {
  const [row] = await tx
    .insert(steps)
    .values({
      projectId,
      position,
      phase: f.phase,
      subGroup: f.subGroup,
      title: f.title,
      notes: f.notes,
      apiDurationS: f.apiDurationS,
      wallDurationS: f.wallDurationS,
      fingerprint: stepFingerprint(f.title, f.usages),
      sourceText,
    })
    .returning({ id: steps.id });
  await tx.insert(stepUsages).values(
    f.usages.map((u, i) => ({
      stepId: row.id,
      position: i,
      model: u.model,
      effort: u.effort,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      cacheRead: u.cacheRead,
      cacheWrite: u.cacheWrite,
      costUsd: u.costUsd === null ? null : u.costUsd.toFixed(4),
    })),
  );
  return row.id;
}

async function uniqueSlug(tx: Tx, name: string): Promise<string> {
  const base = slugify(name);
  const taken = new Set(
    (
      await tx
        .select({ slug: projects.slug })
        .from(projects)
        .where(sql`${projects.slug} = ${base} or ${projects.slug} like ${base + "-%"}`)
    ).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export async function createProject(input: ProjectFieldsInput) {
  const f = projectFieldsSchema.parse(input);
  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, f.name);
    const [row] = await tx
      .insert(projects)
      .values({ slug, name: f.name, description: f.description, status: f.status })
      .returning();
    return row;
  });
}

export async function updateProject(projectId: string, input: ProjectFieldsInput) {
  const f = projectFieldsSchema.parse(input);
  await db
    .update(projects)
    .set({ name: f.name, description: f.description, status: f.status, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export const deleteProject = (projectId: string) =>
  db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, projectId));

export const restoreProject = (projectId: string) =>
  db.update(projects).set({ deletedAt: null }).where(eq(projects.id, projectId));

export type AddStepsResult = {
  added: string[];
  skipped: number;
  warnings: ParseWarning[];
};

const issueText = (issue: { path: PropertyKey[]; message: string }) =>
  `${issue.path.map(String).join(" ")}: ${issue.message}`.replace(/^: /, "");

/** The shared body of addSteps and createProjectWithSteps; runs inside the caller's transaction. */
async function addStepsInTx(tx: Tx, projectId: string, text: string, edits: PasteEdits): Promise<AddStepsResult> {
  const parsed = parseNotes(text);
  const existing = knownFingerprints(
    await tx
      .select({ fingerprint: steps.fingerprint, sourceText: steps.sourceText })
      .from(steps)
      .where(eq(steps.projectId, projectId)),
  );
  const [{ max }] = await tx
    .select({ max: sql<number>`coalesce(max(${steps.position}), 0)` })
    .from(steps)
    .where(eq(steps.projectId, projectId));

  let position = Number(max);
  let skipped = 0;
  const added: string[] = [];
  const warnings = [...parsed.warnings];
  for (const [i, p] of parsed.steps.entries()) {
    const checked = stepFieldsSchema.safeParse({
      title: p.title,
      phase: p.phase,
      subGroup: p.subGroup,
      notes: null,
      apiDurationS: p.apiDurationS,
      wallDurationS: p.wallDurationS,
      usages: p.usages,
      ...edits[String(i)],
    });
    if (!checked.success) {
      // One step that can't be saved never blocks the rest of the paste.
      warnings.push({ line: p.line, message: `“${p.title}” can't be saved (${issueText(checked.error.issues[0])})` });
      continue;
    }
    const f = checked.data;
    const fingerprint = stepFingerprint(f.title, f.usages);
    if (existing.has(fingerprint)) {
      skipped++;
      continue;
    }
    existing.add(fingerprint);
    added.push(await insertStep(tx, projectId, ++position, f, p.sourceText));
  }
  if (added.length) await touchProject(tx, projectId);
  return { added, skipped, warnings: warnings.sort((a, b) => a.line - b.line) };
}

/**
 * Adds the steps in a paste to a project. The server re-parses the text itself; `edits` are the
 * browser's per-step overrides, keyed by the step's index in the parse. Steps already in the
 * project (deleted or not, and also judged by their original pasted text) are skipped.
 */
export async function addSteps(projectId: string, text: string, edits: PasteEdits = {}): Promise<AddStepsResult> {
  pasteTextSchema.parse(text);
  const parsedEdits = pasteEditsSchema.parse(edits);
  return db.transaction(async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), sql`${projects.deletedAt} is null`));
    if (!project) throw new Error("Project not found");
    return addStepsInTx(tx, projectId, text, parsedEdits);
  });
}

/** Creates a project and adds its pasted steps in one transaction: all of it or none of it. */
export async function createProjectWithSteps(input: ProjectFieldsInput, text = "", edits: PasteEdits = {}) {
  const f = projectFieldsSchema.parse(input);
  pasteTextSchema.parse(text);
  const parsedEdits = pasteEditsSchema.parse(edits);
  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, f.name);
    const [project] = await tx
      .insert(projects)
      .values({ slug, name: f.name, description: f.description, status: f.status })
      .returning();
    const result: AddStepsResult = text.trim()
      ? await addStepsInTx(tx, project.id, text, parsedEdits)
      : { added: [], skipped: 0, warnings: [] };
    return { project, ...result };
  });
}

async function projectOfStep(tx: Tx, stepId: string): Promise<string> {
  const [row] = await tx.select({ projectId: steps.projectId }).from(steps).where(eq(steps.id, stepId));
  if (!row) throw new Error("Step not found");
  return row.projectId;
}

/** Replaces a step's fields and model lines. */
export async function updateStep(stepId: string, input: StepFieldsInput) {
  const f = stepFieldsSchema.parse(input);
  await db.transaction(async (tx) => {
    const projectId = await projectOfStep(tx, stepId);
    await tx
      .update(steps)
      .set({
        phase: f.phase,
        subGroup: f.subGroup,
        title: f.title,
        notes: f.notes,
        apiDurationS: f.apiDurationS,
        wallDurationS: f.wallDurationS,
        fingerprint: stepFingerprint(f.title, f.usages),
        updatedAt: new Date(),
      })
      .where(eq(steps.id, stepId));
    await tx.delete(stepUsages).where(eq(stepUsages.stepId, stepId));
    await tx.insert(stepUsages).values(
      f.usages.map((u, i) => ({
        stepId,
        position: i,
        model: u.model,
        effort: u.effort,
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        cacheRead: u.cacheRead,
        cacheWrite: u.cacheWrite,
        costUsd: u.costUsd === null ? null : u.costUsd.toFixed(4),
      })),
    );
    await touchProject(tx, projectId);
  });
}

/** Replaces a step's model lines and durations from the first step found in a new paste. */
export async function repasteStepUsages(stepId: string, text: string): Promise<{ ok: boolean; message?: string }> {
  pasteTextSchema.parse(text);
  const parsed = parseNotes(text);
  if (!parsed.steps.length) return { ok: false, message: "No usage found in that text" };
  const p = parsed.steps[0];
  const [current] = await db.select().from(steps).where(eq(steps.id, stepId));
  if (!current) throw new Error("Step not found");
  await updateStep(stepId, {
    title: current.title,
    phase: current.phase,
    subGroup: current.subGroup,
    notes: current.notes,
    apiDurationS: p.apiDurationS ?? current.apiDurationS,
    wallDurationS: p.wallDurationS ?? current.wallDurationS,
    usages: p.usages,
  });
  return { ok: true };
}

export async function deleteStep(stepId: string) {
  await db.transaction(async (tx) => {
    const projectId = await projectOfStep(tx, stepId);
    await tx.update(steps).set({ deletedAt: new Date() }).where(eq(steps.id, stepId));
    await touchProject(tx, projectId);
  });
}

export async function restoreStep(stepId: string) {
  await db.transaction(async (tx) => {
    const projectId = await projectOfStep(tx, stepId);
    await tx.update(steps).set({ deletedAt: null }).where(eq(steps.id, stepId));
    await touchProject(tx, projectId);
  });
}

/** Swaps a step with its neighbour among the project's non-deleted steps. */
export async function moveStep(stepId: string, direction: "up" | "down") {
  await db.transaction(async (tx) => {
    const projectId = await projectOfStep(tx, stepId);
    const ordered = await tx
      .select({ id: steps.id, position: steps.position })
      .from(steps)
      .where(and(eq(steps.projectId, projectId), sql`${steps.deletedAt} is null`))
      .orderBy(steps.position);
    const i = ordered.findIndex((s) => s.id === stepId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    // Positions are unique enough for ordering; swap the two values.
    await tx.update(steps).set({ position: ordered[j].position }).where(eq(steps.id, ordered[i].id));
    await tx.update(steps).set({ position: ordered[i].position }).where(eq(steps.id, ordered[j].id));
    await touchProject(tx, projectId);
  });
}

export async function stepIdsInProject(projectId: string) {
  return (await db.select({ id: steps.id }).from(steps).where(eq(steps.projectId, projectId))).map((r) => r.id);
}

