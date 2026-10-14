import type { ParsedUsage } from "./parse-notes";

/** cyrb53: small synchronous string hash, runs the same in the browser and on the server. */
function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

export const normaliseTitle = (title: string) =>
  title.trim().replace(/:\s*$/, "").replace(/\s+/g, " ").toLowerCase();

type UsageNumbers = Pick<ParsedUsage, "model" | "inputTokens" | "outputTokens" | "cacheRead" | "cacheWrite"> & {
  effort: string | null;
  costUsd?: number | null;
};

/** Identifies a step by title and usage numbers (cost and durations excluded), to spot re-pasted steps. */
export function stepFingerprint(title: string, usages: UsageNumbers[]): string {
  const parts = usages.map((u) =>
    [u.model, u.effort ?? "", u.inputTokens, u.outputTokens, u.cacheRead, u.cacheWrite].join(","),
  );
  return hash([normaliseTitle(title), ...parts].join("|"));
}
