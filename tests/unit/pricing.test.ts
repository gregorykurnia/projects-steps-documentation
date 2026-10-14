import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNotes } from "@/lib/parse-notes";
import { CALIBRATION_NOTE, estimateCost, knownModel } from "@/lib/pricing";

const million = { inputTokens: 1e6, outputTokens: 1e6, cacheRead: 1e6, cacheWrite: 1e6 };

describe("estimateCost", () => {
  it("prices Opus 5.5 with 5-minute cache writes", () => {
    // 4 + 20 + 0.20 + 5
    expect(estimateCost({ model: "claude-opus-5-5", ...million }, { cacheWrite: "5m" })).toBeCloseTo(29.2, 6);
  });

  it("prices Opus 5.5 with 1-hour cache writes", () => {
    // 4 + 20 + 0.20 + 8
    expect(estimateCost({ model: "claude-opus-5-5", ...million }, { cacheWrite: "1h" })).toBeCloseTo(32.2, 6);
  });

  it("prices Sonnet 5.5 (cache reads are $0.10)", () => {
    // 2 + 10 + 0.10 + 2.50
    expect(estimateCost({ model: "claude-sonnet-5-5", ...million }, { cacheWrite: "5m" })).toBeCloseTo(14.6, 6);
    // 2 + 10 + 0.10 + 4
    expect(estimateCost({ model: "claude-sonnet-5-5", ...million }, { cacheWrite: "1h" })).toBeCloseTo(16.1, 6);
  });

  it("prices Haiku 5.5 in the standard and the over-100K tier", () => {
    // 0.10 + 0.50 + 0.01 + 0.125
    expect(estimateCost({ model: "claude-haiku-5-5", ...million }, { cacheWrite: "5m", tier: "standard" })).toBeCloseTo(0.735, 6);
    // 0.50 + 2.50 + 0.05 + 0.625
    expect(estimateCost({ model: "claude-haiku-5-5", ...million }, { cacheWrite: "5m", tier: "long" })).toBeCloseTo(3.675, 6);
  });

  it("ignores the Haiku tier for other models", () => {
    const a = estimateCost({ model: "claude-opus-5-5", ...million }, { cacheWrite: "5m", tier: "long" });
    expect(a).toBeCloseTo(29.2, 6);
  });

  it("scales with token counts", () => {
    expect(
      estimateCost(
        { model: "claude-opus-5-5", inputTokens: 500_000, outputTokens: 0, cacheRead: 0, cacheWrite: 0 },
        { cacheWrite: "5m" },
      ),
    ).toBeCloseTo(2, 6);
  });

  it("returns null for a model it has no price for", () => {
    expect(estimateCost({ model: "claude-mystery-9", ...million })).toBeNull();
  });

  it("uses the calibrated defaults when no options are given", () => {
    expect(estimateCost({ model: "claude-opus-5-5", ...million })).toBeGreaterThan(0);
  });
});

describe("knownModel", () => {
  it("recognises the three priced models only", () => {
    expect(knownModel("claude-opus-5-5")).toBe(true);
    expect(knownModel("claude-haiku-5-5")).toBe(true);
    expect(knownModel("claude-opus-4-1")).toBe(false);
  });
});

describe("calibration against the seed data's recorded costs", () => {
  const dir = new URL("../../docs/seed-data/", import.meta.url);
  const usages = readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .flatMap((f) => parseNotes(readFileSync(new URL(f, dir), "utf8")).steps.flatMap((s) => s.usages))
    .filter((u) => u.costUsd !== null);

  it.each(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"])("%s estimates land near the recorded costs", (model) => {
    const errs = usages
      .filter((u) => u.model === model)
      .map((u) => Math.abs(estimateCost(u)! - u.costUsd!) / u.costUsd!)
      .sort((a, b) => a - b);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[Math.floor(errs.length / 2)]).toBeLessThan(model === "claude-haiku-5-5" ? 0.1 : 0.02);
  });
});

describe("calibration metadata", () => {
  it("says how many recorded lines the calibration used", () => {
    expect(CALIBRATION_NOTE.recordedLines).toBe(21);
    expect(CALIBRATION_NOTE.date).toBe("2026-10-14");
  });
});
