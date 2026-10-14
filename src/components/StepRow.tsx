import { formatCost, formatDuration, formatExactTokens, formatTokens } from "@/lib/format";
import { usageCost } from "@/lib/steps-view";
import type { StepWithUsages } from "@/db/queries";
import { ModelBadge } from "./ModelBadge";

function Metric({ label, n }: { label: string; n: number }) {
  return (
    <span className="whitespace-nowrap" title={formatExactTokens(n)}>
      <span className="text-xs text-muted">{label} </span>
      <span className="num text-[13px] text-text">{formatTokens(n)}</span>
    </span>
  );
}

function UsageLine({ u }: { u: StepWithUsages["usages"][number] }) {
  const cost = usageCost(u);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <ModelBadge model={u.model} effort={u.effort} />
      <Metric label="in" n={u.inputTokens} />
      <Metric label="out" n={u.outputTokens} />
      <Metric label="cache read" n={u.cacheRead} />
      <Metric label="cache write" n={u.cacheWrite} />
      <span
        className={`num whitespace-nowrap text-[13px] ${cost.estimated ? "est" : "text-text"}`}
        title={cost.value === null ? undefined : `$${cost.value.toFixed(4)}`}
      >
        {formatCost(cost.value, { est: cost.estimated })}
      </span>
    </li>
  );
}

export function StepRow({
  step,
  number,
  menu,
}: {
  step: StepWithUsages;
  number: number;
  menu?: React.ReactNode;
}) {
  const hasTimes = step.apiDurationS !== null || step.wallDurationS !== null;
  return (
    <div id={`step-${step.id}`} data-step-id={step.id} className="scroll-mt-20 border-t border-border px-4 py-3.5 first:border-t-0">
      <div className="flex items-start gap-3">
        <span className="num w-6 shrink-0 pt-0.5 text-right text-xs text-muted">{number}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium text-text">{step.title}</h3>
            {menu}
          </div>
          {step.notes ? <p className="mt-1 whitespace-pre-line text-sm text-muted">{step.notes}</p> : null}
          <ul className="mt-2 space-y-1.5">
            {step.usages.map((u) => (
              <UsageLine key={u.id} u={u} />
            ))}
          </ul>
          {hasTimes ? (
            <p className="mt-2 text-xs text-muted">
              API <span className="num">{formatDuration(step.apiDurationS)}</span> · wall{" "}
              <span className="num">{formatDuration(step.wallDurationS)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
