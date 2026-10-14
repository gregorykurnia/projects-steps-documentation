import { describe, expect, it } from "vitest";
import { formatCost, formatDuration, formatExactTokens, formatTokens } from "@/lib/format";

describe("formatTokens", () => {
  it.each([
    [534, "534"],
    [0, "0"],
    [999, "999"],
    [1_000, "1.0k"],
    [29_800, "29.8k"],
    [120_400, "120.4k"],
    [4_700_000, "4.7M"],
    [8_000_000, "8.0M"],
    [20_900_000, "20.9M"],
  ])("%d → %s", (n, out) => expect(formatTokens(n)).toBe(out));

  it("shows — for a missing value, never 0", () => {
    expect(formatTokens(null)).toBe("—");
    expect(formatTokens(undefined)).toBe("—");
  });
});

describe("formatExactTokens", () => {
  it("adds thousands separators", () => {
    expect(formatExactTokens(4_700_000)).toBe("4,700,000");
    expect(formatExactTokens(null)).toBe("—");
  });
});

describe("formatCost", () => {
  it("formats dollars with two decimals", () => {
    expect(formatCost(5.68)).toBe("$5.68");
    expect(formatCost(0.4368)).toBe("$0.44");
    expect(formatCost(57.0968)).toBe("$57.10");
    expect(formatCost(0)).toBe("$0.00");
  });

  it("shows — for a missing value", () => {
    expect(formatCost(null)).toBe("—");
  });

  it("shows tiny non-zero costs as under one cent", () => {
    expect(formatCost(0.004)).toBe("<$0.01");
  });

  it("labels estimates", () => {
    expect(formatCost(0.54, { est: true })).toBe("$0.54 est.");
    expect(formatCost(null, { est: true })).toBe("—");
  });
});

describe("formatDuration", () => {
  it.each([
    [45, "45s"],
    [236, "3m 56s"],
    [180, "3m"],
    [8062, "2h 14m"],
    [3600, "1h"],
    [0, "0s"],
  ])("%d → %s", (s, out) => expect(formatDuration(s)).toBe(out));

  it("shows — for a missing value", () => {
    expect(formatDuration(null)).toBe("—");
  });
});
