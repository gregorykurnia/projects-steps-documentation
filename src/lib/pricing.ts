// Official Anthropic prices in USD per million tokens, as of 2026-10-14
// (https://platform.claude.com/docs/en/about-claude/pricing). Update here and every estimate follows.

export type Price = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
};

export type CacheWrite = "5m" | "1h";
export type Tier = "standard" | "long";

type ModelPricing = { standard: Price; long?: Price };

const PRICING: Record<string, ModelPricing> = {
  "claude-opus-5-5": {
    standard: { input: 4, output: 20, cacheRead: 0.2, cacheWrite5m: 5, cacheWrite1h: 8 },
  },
  "claude-sonnet-5-5": {
    standard: { input: 2, output: 10, cacheRead: 0.1, cacheWrite5m: 2.5, cacheWrite1h: 4 },
  },
  // Haiku is priced by prompt length: prompts over 100K tokens pay the `long` prices.
  "claude-haiku-5-5": {
    standard: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite5m: 0.125, cacheWrite1h: 0.2 },
    long: { input: 0.5, output: 2.5, cacheRead: 0.05, cacheWrite5m: 0.625, cacheWrite1h: 1 },
  },
};

/**
 * Token totals can't tell whether cache writes were 5-minute or 1-hour, or whether Haiku requests
 * were over 100K, so each model uses whichever option best matched our recorded costs.
 * Produced by `npm run calibrate`; paste its result here.
 */
export const CALIBRATION: Record<string, { cacheWrite: CacheWrite; tier: Tier }> = {
  "claude-opus-5-5": { cacheWrite: "1h", tier: "standard" }, // median error 0.2% on 14 lines
  "claude-sonnet-5-5": { cacheWrite: "1h", tier: "standard" }, // median error 0.2% on 5 lines
  "claude-haiku-5-5": { cacheWrite: "5m", tier: "long" }, // median error 5.3% on 2 lines
};

/** Shown in the footnote under estimated costs. Update with the calibration above. */
export const CALIBRATION_NOTE = { recordedLines: 21, date: "2026-10-14", typicalErrorPct: 5 };

export type PricedUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
};

export type EstimateOptions = { cacheWrite?: CacheWrite; tier?: Tier };

export const knownModel = (model: string) => model in PRICING;
export const pricedModels = () => Object.keys(PRICING);
export const hasLongTier = (model: string) => Boolean(PRICING[model]?.long);

/** Estimated cost in USD, or null when the model has no price. Always shown as "est." in the UI. */
export function estimateCost(usage: PricedUsage, options: EstimateOptions = {}): number | null {
  const pricing = PRICING[usage.model];
  if (!pricing) return null;
  const cal = CALIBRATION[usage.model];
  const cacheWrite = options.cacheWrite ?? cal?.cacheWrite ?? "5m";
  const tier = options.tier ?? cal?.tier ?? "standard";
  const p = (tier === "long" && pricing.long) || pricing.standard;
  const writePrice = cacheWrite === "1h" ? p.cacheWrite1h : p.cacheWrite5m;
  return (
    (usage.inputTokens * p.input +
      usage.outputTokens * p.output +
      usage.cacheRead * p.cacheRead +
      usage.cacheWrite * writePrice) /
    1_000_000
  );
}
