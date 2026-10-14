import { describe, expect, it } from "vitest";
import { effortLabel, modelFamily, modelLabel, modelWithEffort } from "@/lib/models";
import { formatDate } from "@/lib/format";

describe("modelLabel", () => {
  it.each([
    ["claude-opus-5-5", "Opus 5.5"],
    ["claude-sonnet-5-5", "Sonnet 5.5"],
    ["claude-haiku-5-5", "Haiku 5.5"],
    ["claude-opus-4-8", "Opus 4.8"],
    ["claude-fable-5-1", "Fable 5.1"],
  ])("%s → %s", (id, label) => expect(modelLabel(id)).toBe(label));

  it("falls back to the id for names it can't read", () => {
    expect(modelLabel("claude-weird")).toBe("claude-weird");
  });
});

describe("modelFamily", () => {
  it("picks the badge hue family", () => {
    expect(modelFamily("claude-opus-5-5")).toBe("opus");
    expect(modelFamily("claude-sonnet-5-5")).toBe("sonnet");
    expect(modelFamily("claude-haiku-5-5")).toBe("haiku");
    expect(modelFamily("claude-fable-5-1")).toBe("other");
  });
});

describe("effortLabel and modelWithEffort", () => {
  it("labels each effort level", () => {
    expect(["low", "medium", "high", "xhigh", "max"].map(effortLabel)).toEqual(["Low", "Medium", "High", "xHigh", "Max"]);
  });

  it("joins model and effort, and leaves effort off when none was written", () => {
    expect(modelWithEffort("claude-opus-5-5", "high")).toBe("Opus 5.5 · High");
    expect(modelWithEffort("claude-opus-5-5", null)).toBe("Opus 5.5");
  });
});

describe("formatDate", () => {
  it("formats a date as day, short month, year", () => {
    expect(formatDate(new Date("2026-10-14T12:00:00Z"))).toBe("14 Oct 2026");
  });
});
