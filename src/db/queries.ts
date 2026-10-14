import { and, asc, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { projects, stepUsages, steps, type Project, type Step } from "./schema";
import { statsByModel, type UsageRow } from "@/lib/stats";

export const RECENTLY_DELETED_DAYS = 30;

export type UsageWithCost = {
  id: string;
  position: number;
  model: string;
  effort: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number | null;
};
export type StepWithUsages = Step & { usages: UsageWithCost[] };

const toUsage = (u: typeof stepUsages.$inferSelect): UsageWithCost => ({
  id: u.id,
  position: u.position,
  model: u.model,
  effort: u.effort,
  inputTokens: u.inputTokens,
  outputTokens: u.outputTokens,
  cacheRead: u.cacheRead,
  cacheWrite: u.cacheWrite,
  costUsd: u.costUsd === null ? null : Number(u.costUsd),
});

async function withUsages(list: Step[]): Promise<StepWithUsages[]> {
  if (!list.length) return [];
  const ids = new Set(list.map((s) => s.id));
  const all = await db.select().from(stepUsages).orderBy(asc(stepUsages.position));
  const byStep = new Map<string, UsageWithCost[]>();
  for (const u of all) {
    if (!ids.has(u.stepId)) continue;
    const arr = byStep.get(u.stepId) ?? [];
    arr.push(toUsage(u));
    byStep.set(u.stepId, arr);
  }
  return list.map((s) => ({ ...s, usages: byStep.get(s.id) ?? [] }));
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), isNull(projects.deletedAt)));
  return row ?? null;
}

export async function getProjectSteps(projectId: string): Promise<StepWithUsages[]> {
  const list = await db
    .select()
    .from(steps)
    .where(and(eq(steps.projectId, projectId), isNull(steps.deletedAt)))
    .orderBy(asc(steps.position));
  return withUsages(list);
}

export async function getStep(stepId: string): Promise<(StepWithUsages & { project: Project }) | null> {
  const [row] = await db
    .select({ step: steps, project: projects })
    .from(steps)
    .innerJoin(projects, eq(projects.id, steps.projectId))
    .where(and(eq(steps.id, stepId), isNull(steps.deletedAt), isNull(projects.deletedAt)));
  if (!row) return null;
  const [withU] = await withUsages([row.step]);
  return { ...withU, project: row.project };
}

export async function listRecentlyDeletedSteps(projectId: string): Promise<StepWithUsages[]> {
  const since = new Date(Date.now() - RECENTLY_DELETED_DAYS * 86_400_000);
  const list = await db
    .select()
    .from(steps)
    .where(and(eq(steps.projectId, projectId), isNotNull(steps.deletedAt), gt(steps.deletedAt, since)))
    .orderBy(desc(steps.deletedAt));
  return withUsages(list);
}

export async function listRecentlyDeletedProjects(): Promise<Project[]> {
  const since = new Date(Date.now() - RECENTLY_DELETED_DAYS * 86_400_000);
  return db
    .select()
    .from(projects)
    .where(and(isNotNull(projects.deletedAt), gt(projects.deletedAt, since)))
    .orderBy(desc(projects.deletedAt));
}

/** Fingerprints of every step in the project, deleted or not, for "already added" detection. */
export async function existingFingerprints(projectId: string): Promise<string[]> {
  return (await db.select({ f: steps.fingerprint }).from(steps).where(eq(steps.projectId, projectId))).map((r) => r.f);
}

export type ProjectUsageRow = UsageRow & { projectId: string };

/** Every model line of every non-deleted step of every non-deleted project (or of one project). */
export async function usageRows(projectId?: string): Promise<ProjectUsageRow[]> {
  const rows = await db
    .select({
      projectId: steps.projectId,
      stepId: steps.id,
      model: stepUsages.model,
      effort: stepUsages.effort,
      inputTokens: stepUsages.inputTokens,
      outputTokens: stepUsages.outputTokens,
      cacheRead: stepUsages.cacheRead,
      cacheWrite: stepUsages.cacheWrite,
      costUsd: stepUsages.costUsd,
      apiDurationS: steps.apiDurationS,
      wallDurationS: steps.wallDurationS,
    })
    .from(stepUsages)
    .innerJoin(steps, eq(steps.id, stepUsages.stepId))
    .innerJoin(projects, eq(projects.id, steps.projectId))
    .where(
      and(
        isNull(steps.deletedAt),
        isNull(projects.deletedAt),
        projectId ? eq(steps.projectId, projectId) : sql`true`,
      ),
    )
    .orderBy(asc(steps.position), asc(stepUsages.position));
  return rows.map((r) => ({ ...r, costUsd: r.costUsd === null ? null : Number(r.costUsd) }));
}

export type ProjectSummary = Project & {
  stepCount: number;
  totalCost: number | null;
  estimatedCost: number;
  outputTokens: number;
};

export async function listProjects(): Promise<ProjectSummary[]> {
  const list = await db.select().from(projects).where(isNull(projects.deletedAt)).orderBy(desc(projects.updatedAt));
  const rows = await usageRows();
  return list.map((p) => {
    const { total } = statsByModel(
      rows.filter((r) => r.projectId === p.id),
      { groupBy: "model" },
    );
    return {
      ...p,
      stepCount: total.steps,
      totalCost: total.totalCost,
      estimatedCost: total.estimatedCost,
      outputTokens: total.outputTokens,
    };
  });
}
