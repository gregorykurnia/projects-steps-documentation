import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addSteps,
  createProject,
  createProjectWithSteps,
  deleteProject,
  deleteStep,
  moveStep,
  moveStepToProject,
  repasteStepUsages,
  restoreProject,
  restoreStep,
  updateProject,
  updateStep,
} from "@/db/mutations";
import { getProjectBySlug, getProjectSteps, listMoveTargets, listProjectLinks, listProjects, listRecentlyDeletedSteps, usageRows } from "@/db/queries";
import type { Effort } from "@/lib/parse-notes";
import { statsByModel } from "@/lib/stats";
import { MAX_PASTE_CHARS } from "@/lib/schemas";
import { resetTestDb } from "./helpers/db";

const seed = (name: string) => readFileSync(new URL(`../../docs/seed-data/${name}`, import.meta.url), "utf8");
const DEUS = seed("deus-hcs-website.txt");
const WEDDING = seed("wedding-plan-redesign.txt");

beforeEach(resetTestDb);

describe("createProject", () => {
  it("makes a slug from the name and keeps slugs unique", async () => {
    const a = await createProject({ name: "Wedding Plan Redesign" });
    const b = await createProject({ name: "Wedding Plan Redesign" });
    const c = await createProject({ name: "Wedding plan redesign!" });
    expect([a.slug, b.slug, c.slug]).toEqual(["wedding-plan-redesign", "wedding-plan-redesign-2", "wedding-plan-redesign-3"]);
  });

  it("rejects an empty name", async () => {
    await expect(createProject({ name: "   " })).rejects.toThrow();
  });
});

describe("addSteps", () => {
  it("adds the 7 DEUS steps in order with their models, numbers and durations", async () => {
    const p = await createProject({ name: "DEUS HCS Website" });
    const r = await addSteps(p.id, DEUS);
    expect(r.added).toHaveLength(7);
    expect(r.skipped).toBe(0);
    const list = await getProjectSteps(p.id);
    expect(list.map((s) => s.title)).toEqual([
      "Overall Plan, Including Content",
      "Make Designs, 3 Alternatives",
      "Design Guide from Chosen Design Option",
      "Technical Implementation Guide",
      "Scaffold",
      "Schema and First Migration",
      "Tokens",
    ]);
    expect(list[0].usages[0]).toMatchObject({ model: "claude-opus-5-5", effort: "high", outputTokens: 120_400, costUsd: 5.78 });
    expect(list[3]).toMatchObject({ apiDurationS: 308, wallDurationS: 640 });
    expect(list[6]).toMatchObject({ phase: "Implementation", subGroup: "Phase 0" });
    expect(list[6].usages[0].costUsd).toBe(0.4353);
  });

  it("skips every step on a full re-paste", async () => {
    const p = await createProject({ name: "DEUS" });
    await addSteps(p.id, DEUS);
    const again = await addSteps(p.id, DEUS);
    expect(again.added).toEqual([]);
    expect(again.skipped).toBe(7);
    expect(await getProjectSteps(p.id)).toHaveLength(7);
  });

  it("adds only the new steps when a longer version of the notes is pasted", async () => {
    const p = await createProject({ name: "DEUS" });
    const firstThree = DEUS.split("\n").slice(0, 4).join("\n");
    expect((await addSteps(p.id, firstThree)).added).toHaveLength(3);
    const r = await addSteps(p.id, DEUS);
    expect(r.added).toHaveLength(4);
    expect(r.skipped).toBe(3);
    const list = await getProjectSteps(p.id);
    expect(list.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("applies the browser's edits before saving", async () => {
    const p = await createProject({ name: "DEUS" });
    await addSteps(p.id, DEUS, { "0": { title: "Renamed", notes: "a note" } });
    const [first] = await getProjectSteps(p.id);
    expect(first).toMatchObject({ title: "Renamed", notes: "a note" });
  });

  it("does not re-add a step that was deleted (it can be restored instead)", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    await deleteStep(added[0]);
    const r = await addSteps(p.id, DEUS);
    expect(r.added).toEqual([]);
    expect(r.skipped).toBe(7);
  });

  it("returns parser warnings", async () => {
    const p = await createProject({ name: "X" });
    const r = await addSteps(p.id, "Orphan title");
    expect(r.added).toEqual([]);
    expect(r.warnings).toHaveLength(1);
  });

  it("rejects pasted text over the size limit", async () => {
    const p = await createProject({ name: "X" });
    await expect(addSteps(p.id, "x".repeat(MAX_PASTE_CHARS + 1))).rejects.toThrow();
  });

  it("skips a step whose edit breaks a field limit, with a warning, and adds the rest", async () => {
    const p = await createProject({ name: "X" });
    const r = await addSteps(p.id, DEUS, { "2": { title: "t".repeat(301) } });
    expect(r.added).toHaveLength(6);
    expect(r.warnings).toHaveLength(1);
    expect(await getProjectSteps(p.id)).toHaveLength(6);
  });

  it("refuses a deleted or unknown project", async () => {
    const p = await createProject({ name: "X" });
    await deleteProject(p.id);
    await expect(addSteps(p.id, DEUS)).rejects.toThrow("Project not found");
  });
});

describe("re-pasting after edits", () => {
  it("does not add a step again after its title was edited on the edit page", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    const [first] = await getProjectSteps(p.id);
    await updateStep(added[0], {
      title: "Overall Plan, fixed typo",
      phase: first.phase,
      subGroup: first.subGroup,
      notes: null,
      apiDurationS: first.apiDurationS,
      wallDurationS: first.wallDurationS,
      usages: first.usages.map((u) => ({ ...u, effort: u.effort as Effort | null })),
    });
    const again = await addSteps(p.id, DEUS);
    expect(again.added).toEqual([]);
    expect(again.skipped).toBe(7);
  });

  it("does not add a step again after it was edited in the paste preview", async () => {
    const p = await createProject({ name: "DEUS" });
    await addSteps(p.id, DEUS, { "0": { title: "Renamed in preview" } });
    const again = await addSteps(p.id, DEUS);
    expect(again.added).toEqual([]);
    expect(again.skipped).toBe(7);
  });
});

describe("steps that can't be saved", () => {
  it("skips an over-limit step with a warning and still adds the others", async () => {
    const p = await createProject({ name: "X" });
    const text = `${"t".repeat(301)}: claude-opus-5-5: 1 input\nGood: claude-opus-5-5: 2 input`;
    const r = await addSteps(p.id, text);
    expect(r.added).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatchObject({ line: 1 });
    expect((await getProjectSteps(p.id)).map((s) => s.title)).toEqual(["Good"]);
  });
});

describe("createProjectWithSteps", () => {
  it("creates the project and its steps together", async () => {
    const r = await createProjectWithSteps({ name: "Together" }, DEUS);
    expect(r.project.slug).toBe("together");
    expect(r.added).toHaveLength(7);
    expect(await getProjectSteps(r.project.id)).toHaveLength(7);
  });

  it("creates no project at all when the paste is rejected", async () => {
    await expect(createProjectWithSteps({ name: "Nope" }, "x".repeat(MAX_PASTE_CHARS + 1))).rejects.toThrow();
    expect(await listProjects()).toEqual([]);
  });

  it("works with no paste", async () => {
    const r = await createProjectWithSteps({ name: "Empty" }, "");
    expect(r.added).toEqual([]);
    expect((await listProjects()).map((p) => p.slug)).toEqual(["empty"]);
  });
});

describe("step edits", () => {
  it("updateStep replaces fields and model lines", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    await updateStep(added[0], {
      title: "New title",
      phase: "Planning & design",
      subGroup: null,
      notes: "",
      apiDurationS: 10,
      wallDurationS: null,
      usages: [{ model: "claude-haiku-5-5", effort: "max", inputTokens: 1, outputTokens: 2, cacheRead: 3, cacheWrite: 4, costUsd: null }],
    });
    const [first] = await getProjectSteps(p.id);
    expect(first).toMatchObject({ title: "New title", notes: null, apiDurationS: 10, wallDurationS: null });
    expect(first.usages).toHaveLength(1);
    expect(first.usages[0]).toMatchObject({ model: "claude-haiku-5-5", costUsd: null });
  });

  it("repasteStepUsages replaces the numbers from a new paste and keeps the title", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    const r = await repasteStepUsages(added[0], "Whatever: claude-opus-5-5 Low: 5 input, 6 output, 7 cache read, 8 cache write ($1.25). Total duration (API): 10s");
    expect(r.ok).toBe(true);
    const [first] = await getProjectSteps(p.id);
    expect(first.title).toBe("Overall Plan, Including Content");
    expect(first.usages[0]).toMatchObject({ effort: "low", inputTokens: 5, costUsd: 1.25 });
    expect(first.apiDurationS).toBe(10);
  });

  it("repasteStepUsages refuses text with no usage", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    expect((await repasteStepUsages(added[0], "nothing here")).ok).toBe(false);
  });

  it("moves a step up and down among the visible steps, and stops at the ends", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    await moveStep(added[1], "up");
    expect((await getProjectSteps(p.id)).slice(0, 2).map((s) => s.title)).toEqual(["Make Designs, 3 Alternatives", "Overall Plan, Including Content"]);
    await moveStep(added[1], "up");
    expect((await getProjectSteps(p.id))[0].title).toBe("Make Designs, 3 Alternatives");
    await moveStep(added[6], "down");
    expect((await getProjectSteps(p.id))[6].title).toBe("Tokens");
  });

  it("move skips over a deleted step", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    await deleteStep(added[1]);
    await moveStep(added[2], "up");
    expect((await getProjectSteps(p.id)).slice(0, 2).map((s) => s.title)).toEqual(["Design Guide from Chosen Design Option", "Overall Plan, Including Content"]);
  });
});

describe("moveStepToProject", () => {
  it("moves a step with its model lines to the end of the other project and updates both totals", async () => {
    const a = await createProject({ name: "DEUS" });
    const b = await createProject({ name: "Wedding" });
    const { added } = await addSteps(a.id, DEUS);
    await addSteps(b.id, "Existing: claude-opus-5-5 High: 1k input, 2k output ($1.00)");
    const before = (await getProjectSteps(a.id))[2];

    const r = await moveStepToProject(added[2], b.id);
    expect(r.fromProjectId).toBe(a.id);

    expect(await getProjectSteps(a.id)).toHaveLength(6);
    const target = await getProjectSteps(b.id);
    expect(target.map((s) => s.title)).toEqual(["Existing", before.title]);
    expect(target[1]).toMatchObject({ phase: before.phase, subGroup: before.subGroup, notes: before.notes });
    expect(target[1].usages).toEqual(before.usages);
    expect(await listRecentlyDeletedSteps(a.id)).toHaveLength(0);

    const stepsCounted = async (projectId: string) =>
      statsByModel(await usageRows(projectId), { groupBy: "model" }).total.steps;
    expect(await stepsCounted(a.id)).toBe(6);
    expect(await stepsCounted(b.id)).toBe(2);
  });

  it("undo: moving back to the old project and position restores the order", async () => {
    const a = await createProject({ name: "DEUS" });
    const b = await createProject({ name: "Wedding" });
    const { added } = await addSteps(a.id, DEUS);
    const titles = (await getProjectSteps(a.id)).map((s) => s.title);
    const r = await moveStepToProject(added[2], b.id);
    await moveStepToProject(added[2], r.fromProjectId, r.fromPosition);
    expect((await getProjectSteps(a.id)).map((s) => s.title)).toEqual(titles);
    expect(await getProjectSteps(b.id)).toHaveLength(0);
  });

  it("refuses the same project, a deleted target, an unknown target and a deleted step", async () => {
    const a = await createProject({ name: "DEUS" });
    const b = await createProject({ name: "Wedding" });
    const { added } = await addSteps(a.id, DEUS);
    await expect(moveStepToProject(added[0], a.id)).rejects.toThrow();
    await deleteProject(b.id);
    await expect(moveStepToProject(added[0], b.id)).rejects.toThrow();
    await expect(moveStepToProject(added[0], "00000000-0000-0000-0000-000000000000")).rejects.toThrow();
    const c = await createProject({ name: "Third" });
    await deleteStep(added[1]);
    await expect(moveStepToProject(added[1], c.id)).rejects.toThrow();
    expect(await getProjectSteps(a.id)).toHaveLength(6);
  });

  it("lists the other non-deleted projects as targets", async () => {
    const a = await createProject({ name: "DEUS" });
    const b = await createProject({ name: "Wedding" });
    const c = await createProject({ name: "Gone" });
    await deleteProject(c.id);
    expect((await listMoveTargets(a.id)).map((p) => p.name)).toEqual(["Wedding"]);
    expect(b.id).toBeTruthy();
  });

  it("lists every non-deleted project A–Z, ignoring case, for the switcher", async () => {
    await createProject({ name: "wedding" });
    await createProject({ name: "DEUS" });
    await createProject({ name: "apex" });
    const gone = await createProject({ name: "Gone" });
    await deleteProject(gone.id);
    expect((await listProjectLinks()).map((p) => p.name)).toEqual(["apex", "DEUS", "wedding"]);
  });
});

describe("soft delete", () => {
  it("hides a deleted step, lists it under recently deleted, and restores it", async () => {
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    await deleteStep(added[0]);
    expect(await getProjectSteps(p.id)).toHaveLength(6);
    expect((await listRecentlyDeletedSteps(p.id)).map((s) => s.title)).toEqual(["Overall Plan, Including Content"]);
    await restoreStep(added[0]);
    expect(await getProjectSteps(p.id)).toHaveLength(7);
    expect(await listRecentlyDeletedSteps(p.id)).toEqual([]);
  });

  it("leaves steps deleted more than 30 days ago out of the recently deleted list", async () => {
    const { db } = await import("@/db/client");
    const { steps } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const p = await createProject({ name: "DEUS" });
    const { added } = await addSteps(p.id, DEUS);
    await db.update(steps).set({ deletedAt: new Date(Date.now() - 31 * 86_400_000) }).where(eq(steps.id, added[0]));
    expect(await listRecentlyDeletedSteps(p.id)).toEqual([]);
  });

  it("deleting a project hides it and its steps, and restoring brings everything back", async () => {
    const p = await createProject({ name: "DEUS" });
    await addSteps(p.id, DEUS);
    await deleteProject(p.id);
    expect(await getProjectBySlug(p.slug)).toBeNull();
    expect(await listProjects()).toEqual([]);
    expect(await usageRows()).toEqual([]);
    await restoreProject(p.id);
    expect((await getProjectBySlug(p.slug))?.name).toBe("DEUS");
    expect(await getProjectSteps(p.id)).toHaveLength(7);
  });
});

describe("updateProject", () => {
  it("changes name, description and status", async () => {
    const p = await createProject({ name: "A" });
    await updateProject(p.id, { name: "B", description: "desc", status: "done" });
    expect(await getProjectBySlug(p.slug)).toMatchObject({ name: "B", description: "desc", status: "done" });
  });
});

describe("reads over the seeded data", () => {
  it("matches the hand-checked totals of the wedding notes", async () => {
    const p = await createProject({ name: "Wedding Plan Redesign" });
    await addSteps(p.id, WEDDING);
    const { total, rows } = statsByModel(await usageRows(p.id), { groupBy: "model" });
    expect(total.steps).toBe(14);
    expect(total.recordedCost).toBeCloseTo(57.0968, 4);
    expect(total.estimatedCost).toBeGreaterThan(0); // the "Guess the Layout Test 1" step has no cost
    expect(rows.map((r) => r.model).sort()).toEqual(["claude-haiku-5-5", "claude-opus-5-5", "claude-sonnet-5-5"]);
  });

  it("lists projects with totals, and counts only non-deleted steps", async () => {
    const a = await createProject({ name: "DEUS" });
    const { added } = await addSteps(a.id, DEUS);
    await createProject({ name: "Empty" });
    await deleteStep(added[0]);
    const list = await listProjects();
    const deus = list.find((p) => p.slug === "deus")!;
    expect(deus.stepCount).toBe(6);
    expect(deus.totalCost).toBeCloseTo(7.51 + 4.56 + 1.94 + 0.6 + 2.16 + 0.4353, 4);
    expect(list.find((p) => p.slug === "empty")).toMatchObject({ stepCount: 0, totalCost: null });
  });
});
