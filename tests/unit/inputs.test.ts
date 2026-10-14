import { describe, expect, it } from "vitest";
import { durationToText, parseCostText, parseCount, parseDurationText } from "@/lib/inputs";

describe("parseCount", () => {
  it.each([
    ["534", 534],
    ["29.8k", 29_800],
    ["4.7M", 4_700_000],
    ["1,234", 1_234],
    [" 12 ", 12],
    ["0", 0],
  ])("%s → %d", (text, n) => expect(parseCount(text)).toBe(n));

  it("returns null for empty or unreadable text", () => {
    expect(parseCount("")).toBeNull();
    expect(parseCount("abc")).toBeNull();
    expect(parseCount("-5")).toBeNull();
  });
});

describe("parseDurationText", () => {
  it.each([
    ["45s", 45],
    ["3m 56s", 236],
    ["2h 14m 22s", 8062],
    ["2H", 7200],
    ["90", 90],
  ])("%s → %d", (text, s) => expect(parseDurationText(text)).toBe(s));

  it("returns null for empty or unreadable text", () => {
    expect(parseDurationText("")).toBeNull();
    expect(parseDurationText("soon")).toBeNull();
  });
});

describe("durationToText", () => {
  it("round-trips exactly, unlike the display format", () => {
    for (const s of [0, 45, 236, 3600, 8062]) expect(parseDurationText(durationToText(s))).toBe(s);
    expect(durationToText(8062)).toBe("2h 14m 22s");
    expect(durationToText(null)).toBe("");
  });
});

describe("parseCostText", () => {
  it.each([
    ["$5.68", 5.68],
    ["5.68", 5.68],
    ["0.4368", 0.4368],
    [" $1,234.5 ", 1234.5],
  ])("%s → %d", (text, n) => expect(parseCostText(text)).toBe(n));

  it("returns null for empty or unreadable text", () => {
    expect(parseCostText("")).toBeNull();
    expect(parseCostText("free")).toBeNull();
  });
});
