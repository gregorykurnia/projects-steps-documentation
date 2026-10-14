import { describe, expect, it } from "vitest";
import { statsByModel, type UsageRow } from "@/lib/stats";

const row = (over: Partial<UsageRow> & Pick<UsageRow, "stepId" | "model">): UsageRow => ({
  effort: null,
  inputTokens: 0,
  outputTokens: 0,
  cacheRead: 0,
  cacheWrite: 0,
  costUsd: null,
  apiDurationS: null,
  wallDurationS: null,
  ...over,
});

describe("statsByModel", () => {
  const rows: UsageRow[] = [
    row({ stepId: "s1", model: "claude-opus-5-5", effort: "high", inputTokens: 10, outputTokens: 100, cacheRead: 1000, cacheWrite: 50, costUsd: 4, apiDurationS: 60, wallDurationS: 120 }),
    row({ stepId: "s2", model: "claude-opus-5-5", effort: "high", inputTokens: 20, outputTokens: 200, cacheRead: 2000, cacheWrite: 60, costUsd: 6 }),
    row({ stepId: "s3", model: "claude-opus-5-5", effort: "medium", inputTokens: 1, outputTokens: 2, cacheRead: 3, cacheWrite: 4, costUsd: 2 }),
    row({ stepId: "s4", model: "claude-sonnet-5-5", effort: "high", outputTokens: 1_000_000, costUsd: 8 }),
  ];

  it("groups by model + effort, with sums and distinct step counts", () => {
    const { rows: out } = statsByModel(rows, { groupBy: "model+effort" });
    const opusHigh = out.find((r) => r.model === "claude-opus-5-5" && r.effort === "high")!;
    expect(opusHigh).toMatchObject({
      steps: 2,
      inputTokens: 30,
      outputTokens: 300,
      cacheRead: 3000,
      cacheWrite: 110,
      recordedCost: 10,
      estimatedCost: 0,
      totalCost: 10,
      avgCostPerStep: 5,
    });
    expect(out).toHaveLength(3);
  });

  it("groups by model only, merging efforts", () => {
    const { rows: out } = statsByModel(rows, { groupBy: "model" });
    const opus = out.find((r) => r.model === "claude-opus-5-5")!;
    expect(opus).toMatchObject({ effort: null, steps: 3, totalCost: 12 });
    expect(out).toHaveLength(2);
  });

  it("computes each row's share of the total cost and a Total row", () => {
    const { rows: out, total } = statsByModel(rows, { groupBy: "model" });
    expect(total).toMatchObject({ steps: 4, totalCost: 20, costShare: 1 });
    expect(out.find((r) => r.model === "claude-sonnet-5-5")!.costShare).toBeCloseTo(0.4, 9);
  });

  it("sorts rows by total cost, highest first", () => {
    const { rows: out } = statsByModel(rows, { groupBy: "model+effort" });
    expect(out.map((r) => r.totalCost)).toEqual([10, 8, 2]);
  });

  it("estimates a missing cost and keeps recorded and estimated apart", () => {
    const { rows: out } = statsByModel(
      [
        row({ stepId: "a", model: "claude-opus-5-5", outputTokens: 1_000_000, costUsd: 5 }),
        row({ stepId: "b", model: "claude-opus-5-5", outputTokens: 1_000_000 }),
      ],
      { groupBy: "model" },
    );
    expect(out[0].recordedCost).toBe(5);
    expect(out[0].estimatedCost).toBeCloseTo(20, 6);
    expect(out[0].totalCost).toBeCloseTo(25, 6);
  });

  it("leaves cost null when nothing is recorded and the model has no price", () => {
    const { rows: out, total } = statsByModel([row({ stepId: "a", model: "claude-mystery-9" })], { groupBy: "model" });
    expect(out[0].totalCost).toBeNull();
    expect(out[0].avgCostPerStep).toBeNull();
    expect(total.totalCost).toBeNull();
  });

  it("sums durations, and leaves them null when none were recorded", () => {
    const { rows: out } = statsByModel(rows, { groupBy: "model+effort" });
    const opusHigh = out.find((r) => r.model === "claude-opus-5-5" && r.effort === "high")!;
    expect(opusHigh).toMatchObject({ apiDurationS: 60, wallDurationS: 120, durationApprox: false });
    const sonnet = out.find((r) => r.model === "claude-sonnet-5-5")!;
    expect(sonnet.apiDurationS).toBeNull();
    expect(sonnet.wallDurationS).toBeNull();
  });

  it("splits a two-model step's durations by output-token share and flags them approximate", () => {
    const { rows: out, total } = statsByModel(
      [
        row({ stepId: "x", model: "claude-haiku-5-5", outputTokens: 100, apiDurationS: 100, wallDurationS: 200, costUsd: 1 }),
        row({ stepId: "x", model: "claude-opus-5-5", outputTokens: 300, apiDurationS: 100, wallDurationS: 200, costUsd: 3 }),
      ],
      { groupBy: "model" },
    );
    const haiku = out.find((r) => r.model === "claude-haiku-5-5")!;
    const opus = out.find((r) => r.model === "claude-opus-5-5")!;
    expect(haiku).toMatchObject({ apiDurationS: 25, wallDurationS: 50, durationApprox: true });
    expect(opus).toMatchObject({ apiDurationS: 75, wallDurationS: 150, durationApprox: true });
    // The split adds back up to the step's duration, counted once.
    expect(total.apiDurationS).toBe(100);
    expect(total.wallDurationS).toBe(200);
    expect(total.steps).toBe(1);
  });

  it("returns an empty result for no rows", () => {
    const { rows: out, total } = statsByModel([], { groupBy: "model" });
    expect(out).toEqual([]);
    expect(total).toMatchObject({ steps: 0, totalCost: null, apiDurationS: null });
  });
});
