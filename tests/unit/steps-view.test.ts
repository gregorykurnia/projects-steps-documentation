import { describe, expect, it } from "vitest";
import { groupSteps, stepCost, usageCost } from "@/lib/steps-view";

const usage = (over: Record<string, unknown> = {}) => ({
  model: "claude-opus-5-5",
  effort: null,
  inputTokens: 0,
  outputTokens: 1_000_000,
  cacheRead: 0,
  cacheWrite: 0,
  costUsd: null as number | null,
  ...over,
});

describe("usageCost", () => {
  it("uses the recorded cost when there is one", () => {
    expect(usageCost(usage({ costUsd: 3 }))).toEqual({ value: 3, estimated: false });
  });

  it("estimates from tokens when no cost was recorded", () => {
    const c = usageCost(usage());
    expect(c.estimated).toBe(true);
    expect(c.value).toBeCloseTo(20, 6);
  });

  it("has no value when nothing was recorded and the model has no price", () => {
    expect(usageCost(usage({ model: "claude-mystery-9" }))).toEqual({ value: null, estimated: false });
  });
});

describe("stepCost", () => {
  it("adds recorded and estimated parts across a step's model lines", () => {
    const c = stepCost([usage({ costUsd: 3 }), usage()]);
    expect(c.recorded).toBe(3);
    expect(c.estimated).toBeCloseTo(20, 6);
    expect(c.total).toBeCloseTo(23, 6);
  });

  it("is null when no line has a cost", () => {
    expect(stepCost([usage({ model: "claude-mystery-9" })]).total).toBeNull();
  });
});

const step = (id: string, phase: string, subGroup: string | null = null) => ({ id, phase, subGroup });

describe("groupSteps", () => {
  it("groups consecutive steps by phase and sub-group and numbers them across the project", () => {
    const out = groupSteps([
      step("a", "Planning & design"),
      step("b", "Planning & design"),
      step("c", "Implementation", "Phase 0"),
      step("d", "Implementation", "Phase 0"),
      step("e", "Implementation", "Phase 1"),
      step("f", "Implementation"),
    ]);
    expect(out.map((p) => [p.phase, p.groups.map((g) => [g.subGroup, g.steps.map((s) => `${s.number}:${s.id}`)])])).toEqual([
      ["Planning & design", [[null, ["1:a", "2:b"]]]],
      [
        "Implementation",
        [
          ["Phase 0", ["3:c", "4:d"]],
          ["Phase 1", ["5:e"]],
          [null, ["6:f"]],
        ],
      ],
    ]);
  });

  it("starts a new section when a phase comes back after another one", () => {
    const out = groupSteps([step("a", "X"), step("b", "Y"), step("c", "X")]);
    expect(out.map((p) => p.phase)).toEqual(["X", "Y", "X"]);
  });

  it("returns nothing for no steps", () => {
    expect(groupSteps([])).toEqual([]);
  });
});
