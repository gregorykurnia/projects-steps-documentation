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

describe("Codex sessions as autorun sends them", () => {
  const usage = { model: "gpt-6.1-sol", effort: "max", inputTokens: 412530, outputTokens: 38211, cacheRead: 6120448, cacheWrite: 0, costUsd: null };

  it("reads the older format's $0 cost and 0s API time as not recorded", () => {
    const { steps, warnings } = parseNotes(
      [
        "IMPLEMENTATION:",
        "line 240 · C4.1 Story tags in `story/story.ink` for §2 (backgrounds A30, `# bgm`, `# figure`/`# pose` lines):  gpt-6.1-sol Max:  412530 input, 38211 output, 6120448 cache read, 0 cache write ($0.0000)",
        "Total duration (API): 0m 0s. Total duration (wall): 31m 7s",
      ].join("\n"),
    );
    expect(warnings).toEqual([]);
    expect(steps).toHaveLength(1);
    const [s] = steps;
    expect(s.title).toBe("line 240 · C4.1 Story tags in `story/story.ink` for §2 (backgrounds A30, `# bgm`, `# figure`/`# pose` lines)");
    expect(s.usages).toEqual([usage]);
    expect([s.apiDurationS, s.wallDurationS]).toEqual([null, 1867]);
  });

  it("reads the current format, which leaves both out", () => {
    const { steps, warnings } = parseNotes(
      "IMPLEMENTATION:\nR4 · Chapter 4 review:  gpt-6-astra Xhigh:  10 input, 20 output, 30 cache read, 0 cache write\nTotal duration (wall): 1h 2m 3s",
    );
    expect(warnings).toEqual([]);
    expect(steps[0].usages[0]).toMatchObject({ model: "gpt-6-astra", effort: "xhigh", costUsd: null });
    expect([steps[0].apiDurationS, steps[0].wallDurationS]).toEqual([null, 3723]);
  });

  it("keeps a real $0 and a 0s API time on Claude lines", () => {
    const [s] = parseNotes("Tiny:  claude-haiku-5-5:  1 input, 1 output ($0.0000). Total duration (API): 0s").steps;
    expect([s.usages[0].costUsd, s.apiDurationS]).toEqual([0, 0]);
  });
});
