import { formatCost } from "@/lib/format";
import { Card } from "./ui/card";

export type CostBarStep = {
  id: string;
  number: number;
  title: string;
  recorded: number;
  estimated: number;
  total: number | null;
};

/** One horizontal bar per step, in step order. Estimated cost is hatched. */
export function CostBars({ steps }: { steps: CostBarStep[] }) {
  const max = Math.max(0, ...steps.map((s) => s.total ?? 0));
  const pct = (v: number) => (max > 0 ? `${(v / max) * 100}%` : "0%");

  return (
    <Card className="px-4 py-3.5">
      <h2 className="text-sm font-semibold text-text">Cost by step</h2>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <a
              href={`#step-${s.id}`}
              className="flex min-w-0 items-baseline gap-2 text-sm text-text hover:text-accent sm:w-72 sm:shrink-0"
            >
              <span className="num w-5 shrink-0 text-right text-xs text-muted">{s.number}</span>
              <span className="truncate" title={s.title}>
                {s.title}
              </span>
            </a>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-2.5 min-w-0 flex-1 items-center" aria-hidden>
                {s.total !== null ? (
                  <div className="flex h-full overflow-hidden rounded-sm" style={{ width: pct(s.total) }}>
                    <div className="h-full bg-accent" style={{ width: `${(s.recorded / s.total) * 100}%` }} />
                    {s.estimated > 0 ? <div className="bar-est h-full" style={{ width: `${(s.estimated / s.total) * 100}%` }} /> : null}
                  </div>
                ) : null}
              </div>
              <span className={`num w-24 shrink-0 text-right text-xs ${s.estimated > 0 && s.recorded === 0 ? "est" : "text-text"}`}>
                {s.total === null ? "—" : formatCost(s.total, { est: s.estimated > 0 && s.recorded === 0 })}
                {s.total !== null && s.estimated > 0 && s.recorded > 0 ? <span className="est ml-1">+est.</span> : null}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
