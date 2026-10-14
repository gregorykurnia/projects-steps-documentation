"use client";

import { useState } from "react";
import { formatCost, formatDuration, formatExactTokens, formatTokens } from "@/lib/format";
import type { ModelStat } from "@/lib/stats";
import { Cost } from "./Cost";
import { ModelBadge } from "./ModelBadge";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";

export type StatsResult = { rows: ModelStat[]; total: ModelStat };

const th = "px-3 py-2.5 text-right text-xs font-medium text-muted whitespace-nowrap";
const td = "px-3 py-2.5 text-right align-top whitespace-nowrap";
const pinned = "sticky left-0 z-10 bg-surface";

function Tokens({ n }: { n: number }) {
  return (
    <span className="num" title={formatExactTokens(n)}>
      {formatTokens(n)}
    </span>
  );
}

function Duration({ s, approx }: { s: number | null; approx: boolean }) {
  return (
    <span className="num" title={approx ? "Split between models by output-token share" : undefined}>
      {s !== null && approx ? "≈ " : ""}
      {formatDuration(s === null ? null : s)}
    </span>
  );
}

function Row({ r, label }: { r: ModelStat; label: React.ReactNode }) {
  return (
    <tr className="border-t border-border">
      <th scope="row" className={`${pinned} px-3 py-2.5 text-left align-top font-normal`}>
        {label}
      </th>
      <td className={td}><span className="num">{r.steps}</span></td>
      <td className={td}><Tokens n={r.inputTokens} /></td>
      <td className={td}><Tokens n={r.outputTokens} /></td>
      <td className={td}><Tokens n={r.cacheRead} /></td>
      <td className={td}><Tokens n={r.cacheWrite} /></td>
      <td className={td}><Cost total={r.totalCost} estimated={r.estimatedCost} /></td>
      <td className={td}>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-border" aria-hidden>
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(r.costShare * 100)}%` }} />
          </span>
          <span className="num w-10 text-right text-xs text-muted">
            {r.totalCost === null ? "—" : `${Math.round(r.costShare * 100)}%`}
          </span>
        </span>
      </td>
      <td className={td}><Duration s={r.apiDurationS} approx={r.durationApprox} /></td>
      <td className={td}><Duration s={r.wallDurationS} approx={r.durationApprox} /></td>
      <td className={td}><span className="num">{formatCost(r.avgCostPerStep)}</span></td>
    </tr>
  );
}

/** Stats per model (or per model + effort); the switch merges efforts. */
export function ModelStatsTable({
  byModelEffort,
  byModel,
  title = "Stats per model",
}: {
  byModelEffort: StatsResult;
  byModel: StatsResult;
  title?: string;
}) {
  const [modelOnly, setModelOnly] = useState(false);
  const data = modelOnly ? byModel : byModelEffort;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-3.5">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <Switch label="Group by model only" checked={modelOnly} onCheckedChange={setModelOnly} />
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr>
              <th scope="col" className={`${pinned} px-3 py-2.5 text-left text-xs font-medium text-muted`}>Model</th>
              <th scope="col" className={th}>Steps</th>
              <th scope="col" className={th}>Input</th>
              <th scope="col" className={th}>Output</th>
              <th scope="col" className={th}>Cache read</th>
              <th scope="col" className={th}>Cache write</th>
              <th scope="col" className={th}>Cost</th>
              <th scope="col" className={th}>Share</th>
              <th scope="col" className={th}>API time</th>
              <th scope="col" className={th}>Wall time</th>
              <th scope="col" className={th}>Avg / step</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <Row key={r.key} r={r} label={<ModelBadge model={r.model} effort={r.effort} />} />
            ))}
            <Row r={data.total} label={<span className="text-sm font-semibold text-text">Total</span>} />
          </tbody>
        </table>
      </div>
    </Card>
  );
}
