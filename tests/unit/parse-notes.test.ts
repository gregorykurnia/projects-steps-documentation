import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNotes } from "@/lib/parse-notes";

const seed = (name: string) =>
  readFileSync(new URL(`../../docs/seed-data/${name}`, import.meta.url), "utf8");

describe("wedding-plan-redesign.txt", () => {
  const r = parseNotes(seed("wedding-plan-redesign.txt"));
  const step = (title: string) => r.steps.find((s) => s.title === title)!;

  it("reads the project name from the first line", () => {
    expect(r.projectName).toBe("Wedding Plan Redesign");
  });

  it("finds all 14 steps with no warnings", () => {
    expect(r.steps).toHaveLength(14);
    expect(r.warnings).toEqual([]);
  });

  it("puts steps before IMPLEMENTATION in Planning & design and the rest in Implementation", () => {
    expect(r.steps.slice(0, 11).every((s) => s.phase === "Planning & design")).toBe(true);
    expect(r.steps.slice(11).map((s) => s.phase)).toEqual([
      "Implementation",
      "Implementation",
      "Implementation",
    ]);
    expect(r.steps.every((s) => s.subGroup === null)).toBe(true);
  });

  it("reads a title on its own line followed by a model line", () => {
    expect(step("Capability Inventory Mapping").usages).toEqual([
      {
        model: "claude-opus-5-5",
        effort: "medium",
        inputTokens: 29_800,
        outputTokens: 78_400,
        cacheRead: 4_700_000,
        cacheWrite: 536_300,
        costUsd: 5.68,
      },
    ]);
  });

  it("keeps a missing cost as null", () => {
    expect(step("Guess the Layout Test 1").usages[0].costUsd).toBeNull();
  });

  it("keeps a cost with four decimals exactly", () => {
    expect(step("Update Design Brief").usages[0].costUsd).toBe(0.4368);
  });

  it("reads a model line with no effort", () => {
    expect(step("Expand Design").usages[0].effort).toBeNull();
  });

  it("reads two model lines as two usages of one step", () => {
    const s = step("Inventory Notes");
    expect(s.usages.map((u) => [u.model, u.effort, u.costUsd])).toEqual([
      ["claude-haiku-5-5", null, 0.72],
      ["claude-opus-5-5", null, 3.17],
    ]);
  });

  it("reads one-line titles that contain commas and an ellipsis, with durations", () => {
    const s = step("Test Harness, Old UI Smoke Test, Route Groups and Legacy href");
    expect(s.usages[0]).toMatchObject({ model: "claude-sonnet-5-5", inputTokens: 56_700 });
    expect(s.apiDurationS).toBe(19 * 60 + 52);
    expect(s.wallDurationS).toBe(2 * 3600 + 14 * 60 + 22);
    expect(step("Guests, items…, dates, agendas, month…, SUM engine and table sort").usages[0].cacheWrite).toBe(350_100);
  });

  it("reads a title and model line and durations that all sit on one line", () => {
    const s = step("Money Model");
    expect(s.usages[0]).toMatchObject({ effort: "medium", inputTokens: 44, costUsd: 1.65 });
    expect([s.apiDurationS, s.wallDurationS]).toEqual([236, 534]);
  });

  it("leaves durations null when not written", () => {
    expect(step("Design Guide").apiDurationS).toBeNull();
    expect(step("Design Guide").wallDurationS).toBeNull();
  });

  it("sums to the hand-checked recorded cost", () => {
    const total = r.steps.flatMap((s) => s.usages).reduce((a, u) => a + (u.costUsd ?? 0), 0);
    expect(total).toBeCloseTo(57.0968, 4);
  });
});

describe("deus-hcs-website.txt", () => {
  const r = parseNotes(seed("deus-hcs-website.txt"));

  it("finds all 7 steps with no warnings and no project name", () => {
    expect(r.steps).toHaveLength(7);
    expect(r.warnings).toEqual([]);
    expect(r.projectName).toBeUndefined();
  });

  it("reads a first line that is a title and a model line together", () => {
    expect(r.steps[0].title).toBe("Overall Plan, Including Content");
    expect(r.steps[0].usages[0]).toMatchObject({
      model: "claude-opus-5-5",
      effort: "high",
      inputTokens: 1_600,
      outputTokens: 120_400,
      cacheRead: 8_000_000,
      cacheWrite: 222_200,
      costUsd: 5.78,
    });
  });

  it("starts the Implementation phase and the Phase 0 sub-group", () => {
    expect(r.steps.map((s) => [s.phase, s.subGroup])).toEqual([
      ["Planning & design", null],
      ["Planning & design", null],
      ["Planning & design", null],
      ["Planning & design", null],
      ["Implementation", "Phase 0"],
      ["Implementation", "Phase 0"],
      ["Implementation", "Phase 0"],
    ]);
  });

  it("reads lowercase effort and a four-decimal cost", () => {
    expect(r.steps[5].usages[0].effort).toBe("high");
    expect(r.steps[6].usages[0]).toMatchObject({ model: "claude-haiku-5-5", effort: "max", costUsd: 0.4353 });
  });

  it("reads durations on a model line", () => {
    expect([r.steps[3].apiDurationS, r.steps[3].wallDurationS]).toEqual([308, 640]);
  });
});

describe("parseNotes edge cases", () => {
  it("returns nothing for empty or blank input", () => {
    expect(parseNotes("")).toEqual({ steps: [], warnings: [] });
    expect(parseNotes("\n  \n\n")).toEqual({ steps: [], warnings: [] });
  });

  it("warns, with the line number, about a title that has no usage", () => {
    const r = parseNotes("Lonely Title\nReal: claude-opus-5-5: 1 input, 2 output");
    expect(r.steps.map((s) => s.title)).toEqual(["Real"]);
    expect(r.warnings).toEqual([{ line: 1, message: "no usage found for “Lonely Title”" }]);
  });

  it("warns about a trailing title with no usage", () => {
    const r = parseNotes("A: claude-opus-5-5: 1 input\nOrphan:");
    expect(r.steps).toHaveLength(1);
    expect(r.warnings).toEqual([{ line: 2, message: "no usage found for “Orphan”" }]);
  });

  it("warns about a model line that has no step to belong to", () => {
    const r = parseNotes("claude-opus-5-5: 1 input, 2 output");
    expect(r.steps).toEqual([]);
    expect(r.warnings).toEqual([
      { line: 1, message: "model line without a step title: claude-opus-5-5: 1 input, 2 output" },
    ]);
  });

  it("reads k and m suffixes, plain numbers and thousands separators as whole tokens", () => {
    const [s] = parseNotes("T: claude-haiku-5-5 Max: 534 input, 1.4k output, 4.7m cache read, 1,234 cache write").steps;
    expect(s.usages[0]).toMatchObject({ inputTokens: 534, outputTokens: 1_400, cacheRead: 4_700_000, cacheWrite: 1_234 });
  });

  it("reads model and effort case-insensitively", () => {
    const [s] = parseNotes("T: CLAUDE-Opus-5-5 XHIGH: 1 input").steps;
    expect(s.usages[0]).toMatchObject({ model: "claude-opus-5-5", effort: "xhigh" });
  });

  it("reads the duration formats 45s, 3m 56s and 2h 14m 22s", () => {
    const r = parseNotes(
      [
        "A: claude-opus-5-5: 1 input. Total duration (API): 45s. Total duration (wall): 3m 56s",
        "B: claude-opus-5-5: 1 input. Total duration (wall): 2h 14m 22s",
      ].join("\n"),
    );
    expect(r.steps.map((s) => [s.apiDurationS, s.wallDurationS])).toEqual([
      [45, 236],
      [null, 8062],
    ]);
  });

  it("attaches a durations-only line to the current step", () => {
    const [s] = parseNotes(
      "Alpha\nclaude-opus-5-5: 1 input\nTotal duration (API): 1m 0s. Total duration (wall): 2m 0s",
    ).steps;
    expect([s.apiDurationS, s.wallDurationS]).toEqual([60, 120]);
  });

  it("starts a new phase from an all-capitals line and resets the sub-group", () => {
    const r = parseNotes(
      "A: claude-opus-5-5: 1 input\nBUILD AND LAUNCH:\nPhase 1:\nB: claude-opus-5-5: 1 input\nTESTING\nC: claude-opus-5-5: 1 input",
    );
    expect(r.steps.map((s) => [s.title, s.phase, s.subGroup])).toEqual([
      ["A", "Planning & design", null],
      ["B", "Build and launch", "Phase 1"],
      ["C", "Testing", null],
    ]);
  });

  it("records the lines a step came from", () => {
    const [s] = parseNotes("Title\nclaude-opus-5-5: 1 input\nclaude-haiku-5-5: 2 input").steps;
    expect(s.sourceText).toBe("Title\nclaude-opus-5-5: 1 input\nclaude-haiku-5-5: 2 input");
  });

  it("takes the model that is followed by token counts, not an earlier word that looks like one", () => {
    const [s] = parseNotes("Fix claude-md: Claude-opus-5-5 High: 1k input, 2k output ($0.10)").steps;
    expect(s.title).toBe("Fix claude-md");
    expect(s.usages).toEqual([
      { model: "claude-opus-5-5", effort: "high", inputTokens: 1000, outputTokens: 2000, cacheRead: 0, cacheWrite: 0, costUsd: 0.1 },
    ]);
  });

  it("reads two models on one line as two usages, each with its own numbers and cost", () => {
    const r = parseNotes(
      "Step A: claude-opus-5-5 High: 1k input, 2k output ($0.10), claude-haiku-5-5: 3k input, 4k output ($0.02). Total duration (API): 10s",
    );
    expect(r.warnings).toEqual([]);
    const [s] = r.steps;
    expect(s.usages.map((u) => [u.model, u.effort, u.inputTokens, u.outputTokens, u.costUsd])).toEqual([
      ["claude-opus-5-5", "high", 1000, 2000, 0.1],
      ["claude-haiku-5-5", null, 3000, 4000, 0.02],
    ]);
    expect(s.apiDurationS).toBe(10);
  });
});
