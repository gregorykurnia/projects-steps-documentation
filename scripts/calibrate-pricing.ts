// Tries each cache-write option (and the Haiku over-100K tier) against every recorded cost in
// docs/seed-data/*.txt and prints the error per option, with the best one marked.
// Paste the winners into CALIBRATION in src/lib/pricing.ts, with the date.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseNotes, type ParsedUsage } from "../src/lib/parse-notes";
import { estimateCost, hasLongTier, pricedModels, type CacheWrite, type Tier } from "../src/lib/pricing";

const dir = path.join(import.meta.dirname, "..", "docs", "seed-data");
const recorded: ParsedUsage[] = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt"))) {
  for (const step of parseNotes(readFileSync(path.join(dir, file), "utf8")).steps) {
    for (const u of step.usages) if (u.costUsd !== null && u.costUsd > 0) recorded.push(u);
  }
}
console.log(`${recorded.length} recorded usage lines in ${dir}\n`);

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2 : NaN;
};

for (const model of pricedModels()) {
  const rows = recorded.filter((u) => u.model === model);
  if (!rows.length) {
    console.log(`${model}: no recorded costs, keeping defaults\n`);
    continue;
  }
  const tiers: Tier[] = hasLongTier(model) ? ["standard", "long"] : ["standard"];
  const results = tiers.flatMap((tier) =>
    (["5m", "1h"] as CacheWrite[]).map((cacheWrite) => {
      const errs = rows.map((u) => Math.abs(estimateCost(u, { cacheWrite, tier })! - u.costUsd!) / u.costUsd!);
      return { tier, cacheWrite, mean: (errs.reduce((a, b) => a + b, 0) / errs.length) * 100, median: median(errs) * 100, max: Math.max(...errs) * 100 };
    }),
  );
  const best = results.reduce((a, b) => (b.median < a.median ? b : a));
  console.log(`${model} (${rows.length} lines)`);
  for (const r of results) {
    console.log(
      `  ${r === best ? "*" : " "} writes ${r.cacheWrite}, tier ${r.tier.padEnd(8)} median ${r.median.toFixed(1)}%  mean ${r.mean.toFixed(1)}%  max ${r.max.toFixed(1)}%`,
    );
  }
  console.log(`  → "${model}": { cacheWrite: "${best.cacheWrite}", tier: "${best.tier}" }  // median error ${best.median.toFixed(1)}%\n`);
}
