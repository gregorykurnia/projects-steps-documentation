import { describe, expect, it } from "vitest";
import { checkIngestKey, ingestBodySchema } from "@/lib/ingest";
import { parseNotes } from "@/lib/parse-notes";
import { MAX_PASTE_CHARS } from "@/lib/schemas";

describe("checkIngestKey", () => {
  it("is off until a key is configured", () => {
    expect(checkIngestKey("Bearer anything", undefined)).toBe("off");
    expect(checkIngestKey("Bearer anything", "")).toBe("off");
  });

  it("accepts the configured key only", () => {
    expect(checkIngestKey("Bearer s3cret", "s3cret")).toBe("ok");
    expect(checkIngestKey("bearer  s3cret ", "s3cret")).toBe("ok");
    expect(checkIngestKey("Bearer s3cre", "s3cret")).toBe("wrong");
    expect(checkIngestKey("Bearer s3cret-and-more", "s3cret")).toBe("wrong");
    expect(checkIngestKey("s3cret", "s3cret")).toBe("wrong");
    expect(checkIngestKey(null, "s3cret")).toBe("wrong");
  });
});

describe("ingestBodySchema", () => {
  it("takes a project and notes", () => {
    expect(ingestBodySchema.parse({ project: " DEUS Team Tasks Redesign ", text: "x" }).project).toBe("DEUS Team Tasks Redesign");
  });

  it("rejects a missing project, empty notes and an oversized paste", () => {
    expect(ingestBodySchema.safeParse({ text: "x" }).success).toBe(false);
    expect(ingestBodySchema.safeParse({ project: "P", text: "  \n" }).success).toBe(false);
    expect(ingestBodySchema.safeParse({ project: "P", text: "x".repeat(MAX_PASTE_CHARS + 1) }).success).toBe(false);
  });
});

// The exact shape autorun sends (~/.claude/scripts/autorun.sh, buildlog_text), so a change to the
// parser that breaks it shows up here.
describe("notes as autorun sends them", () => {
  const text = [
    "IMPLEMENTATION:",
    "3.4 · Today screen: list, quick add (retry on Opus High):  claude-opus-5-5 High:  212 input, 76140 output, 8140276 cache read, 390257 cache write ($5.3750)",
    "claude-haiku-5-5:  12 input, 2400 output, 31000 cache read, 1800 cache write ($0.0123)",
    "Total duration (API): 1h 2m 3s. Total duration (wall): 11m 48s",
  ].join("\n");

  it("becomes one step with every model, its cost and both durations", () => {
    const { steps, warnings } = parseNotes(text);
    expect(warnings).toEqual([]);
    expect(steps).toHaveLength(1);
    const [s] = steps;
    expect(s.title).toBe("3.4 · Today screen: list, quick add (retry on Opus High)");
    expect(s.phase).toBe("Implementation");
    expect(s.apiDurationS).toBe(3723);
    expect(s.wallDurationS).toBe(708);
    expect(s.usages).toEqual([
      { model: "claude-opus-5-5", effort: "high", inputTokens: 212, outputTokens: 76140, cacheRead: 8140276, cacheWrite: 390257, costUsd: 5.375 },
      { model: "claude-haiku-5-5", effort: null, inputTokens: 12, outputTokens: 2400, cacheRead: 31000, cacheWrite: 1800, costUsd: 0.0123 },
    ]);
  });
});
