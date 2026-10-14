import { estimateCost } from "./pricing";

/** One model line of a step, plus the durations of the step it belongs to. */
export type UsageRow = {
  stepId: string;
  model: string;
  effort: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number | null;
  apiDurationS: number | null;
  wallDurationS: number | null;
};

export type ModelStat = {
  key: string;
  model: string;
  /** null when grouping by model only. */
  effort: string | null;
  steps: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  recordedCost: number;
  estimatedCost: number;
  /** recorded + estimated; null when no cost is known at all. */
  totalCost: number | null;
  costShare: number;
  avgCostPerStep: number | null;
  apiDurationS: number | null;
  wallDurationS: number | null;
  /** True when a step's duration was split between several models. */
  durationApprox: boolean;
};

type Acc = {
  key: string;
  model: string;
  effort: string | null;
  stepIds: Set<string>;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  recordedCost: number;
  estimatedCost: number;
  anyCost: boolean;
  api: number | null;
  wall: number | null;
  approx: boolean;
};

const newAcc = (key: string, model: string, effort: string | null): Acc => ({
  key,
  model,
  effort,
  stepIds: new Set(),
  inputTokens: 0,
  outputTokens: 0,
  cacheRead: 0,
  cacheWrite: 0,
  recordedCost: 0,
  estimatedCost: 0,
  anyCost: false,
  api: null,
  wall: null,
  approx: false,
});

function finish(a: Acc, grandCost: number | null): ModelStat {
  const totalCost = a.anyCost ? a.recordedCost + a.estimatedCost : null;
  const steps = a.stepIds.size;
  return {
    key: a.key,
    model: a.model,
    effort: a.effort,
    steps,
    inputTokens: a.inputTokens,
    outputTokens: a.outputTokens,
    cacheRead: a.cacheRead,
    cacheWrite: a.cacheWrite,
    recordedCost: a.recordedCost,
    estimatedCost: a.estimatedCost,
    totalCost,
    costShare: totalCost !== null && grandCost ? totalCost / grandCost : 0,
    avgCostPerStep: totalCost !== null && steps ? totalCost / steps : null,
    apiDurationS: a.api,
    wallDurationS: a.wall,
    durationApprox: a.approx,
  };
}

function add(a: Acc, r: UsageRow, share: number, split: boolean) {
  a.stepIds.add(r.stepId);
  a.inputTokens += r.inputTokens;
  a.outputTokens += r.outputTokens;
  a.cacheRead += r.cacheRead;
  a.cacheWrite += r.cacheWrite;
  if (r.costUsd !== null) {
    a.recordedCost += r.costUsd;
    a.anyCost = true;
  } else {
    const est = estimateCost(r);
    if (est !== null) {
      a.estimatedCost += est;
      a.anyCost = true;
    }
  }
  if (r.apiDurationS !== null) a.api = (a.api ?? 0) + r.apiDurationS * share;
  if (r.wallDurationS !== null) a.wall = (a.wall ?? 0) + r.wallDurationS * share;
  if (split && (r.apiDurationS !== null || r.wallDurationS !== null)) a.approx = true;
}

/** Stats per model (or per model + effort) over a set of usage rows. */
export function statsByModel(
  rows: UsageRow[],
  opts: { groupBy: "model" | "model+effort" },
): { rows: ModelStat[]; total: ModelStat } {
  // A step's durations belong to the step, so a multi-model step's are split by output-token share.
  const byStep = new Map<string, UsageRow[]>();
  for (const r of rows) {
    const list = byStep.get(r.stepId);
    if (list) list.push(r);
    else byStep.set(r.stepId, [r]);
  }
  const shareOf = (r: UsageRow): { share: number; split: boolean } => {
    const siblings = byStep.get(r.stepId)!;
    if (siblings.length === 1) return { share: 1, split: false };
    const out = siblings.reduce((n, s) => n + s.outputTokens, 0);
    return { share: out > 0 ? r.outputTokens / out : 1 / siblings.length, split: true };
  };

  const groups = new Map<string, Acc>();
  const total = newAcc("total", "total", null);
  for (const r of rows) {
    const effort = opts.groupBy === "model+effort" ? r.effort : null;
    const key = effort ? `${r.model}|${effort}` : r.model;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = newAcc(key, r.model, effort)));
    const { share, split } = shareOf(r);
    add(g, r, share, split);
    add(total, r, share, split);
  }

  const grand = total.anyCost ? total.recordedCost + total.estimatedCost : null;
  const out = [...groups.values()].map((g) => finish(g, grand));
  out.sort((a, b) => (b.totalCost ?? -1) - (a.totalCost ?? -1));
  const totalStat = finish(total, grand);
  totalStat.costShare = grand === null ? 0 : 1;
  return { rows: out, total: totalStat };
}
