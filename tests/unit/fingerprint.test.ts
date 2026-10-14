import { describe, expect, it } from "vitest";
import { stepFingerprint } from "@/lib/fingerprint";

const usage = {
  model: "claude-opus-5-5",
  effort: "high" as string | null,
  inputTokens: 1,
  outputTokens: 2,
  cacheRead: 3,
  cacheWrite: 4,
  costUsd: 5 as number | null,
};

describe("stepFingerprint", () => {
  it("is the same for the same title and numbers", () => {
    expect(stepFingerprint("Scaffold", [usage])).toBe(stepFingerprint("Scaffold", [{ ...usage }]));
  });

  it("ignores case, spacing and a trailing colon in the title", () => {
    expect(stepFingerprint("  Money   Model: ", [usage])).toBe(stepFingerprint("money model", [usage]));
  });

  it("ignores cost, so a later-added cost still counts as the same step", () => {
    expect(stepFingerprint("X", [usage])).toBe(stepFingerprint("X", [{ ...usage, costUsd: null }]));
  });

  it("changes when a token number, model or effort changes", () => {
    const base = stepFingerprint("X", [usage]);
    expect(stepFingerprint("X", [{ ...usage, outputTokens: 9 }])).not.toBe(base);
    expect(stepFingerprint("X", [{ ...usage, model: "claude-haiku-5-5" }])).not.toBe(base);
    expect(stepFingerprint("X", [{ ...usage, effort: null }])).not.toBe(base);
  });

  it("changes when the title changes", () => {
    expect(stepFingerprint("X", [usage])).not.toBe(stepFingerprint("Y", [usage]));
  });
});
