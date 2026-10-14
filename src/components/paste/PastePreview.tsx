"use client";

import { useState } from "react";
import { AlertTriangle, Pencil } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { formatCost, formatExactTokens, formatTokens } from "@/lib/format";
import { stepToForm, type StepForm } from "@/lib/step-form";
import { usageCost } from "@/lib/steps-view";
import { ModelBadge } from "../ModelBadge";
import { StepFieldsForm } from "../StepFieldsForm";
import { Button } from "../ui/button";
import type { PreviewItem } from "./usePaste";

function UsageSummary({ u }: { u: NonNullable<PreviewItem["fields"]>["usages"][number] }) {
  const cost = usageCost(u);
  const m = (label: string, n: number) => (
    <span className="whitespace-nowrap" title={formatExactTokens(n)}>
      <span className="text-xs text-muted">{label} </span>
      <span className="num text-[13px]">{formatTokens(n)}</span>
    </span>
  );
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <ModelBadge model={u.model} effort={u.effort} />
      {m("in", u.inputTokens)}
      {m("out", u.outputTokens)}
      {m("cache read", u.cacheRead)}
      {m("cache write", u.cacheWrite)}
      <span className={`num whitespace-nowrap text-[13px] ${cost.estimated ? "est" : ""}`}>
        {formatCost(cost.value, { est: cost.estimated })}
      </span>
    </li>
  );
}

function PreviewStep({
  item,
  edit,
  onEdit,
}: {
  item: PreviewItem;
  edit: StepForm | undefined;
  onEdit: (form: StepForm | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const f = item.fields;
  const base = {
    title: item.parsed.title,
    phase: item.parsed.phase,
    subGroup: item.parsed.subGroup,
    notes: null,
    apiDurationS: item.parsed.apiDurationS,
    wallDurationS: item.parsed.wallDurationS,
    usages: item.parsed.usages,
  };

  return (
    <li
      className={`rounded-card border px-3.5 py-3 ${item.already ? "border-border opacity-55" : "border-border bg-surface"}`}
      data-already={item.already}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            {(f?.phase ?? item.parsed.phase)}
            {(f?.subGroup ?? item.parsed.subGroup) ? ` · ${f?.subGroup ?? item.parsed.subGroup}` : ""}
          </p>
          <p className="text-sm font-medium text-text">{f?.title ?? item.parsed.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.already ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">already added</span>
          ) : (
            <Button variant="ghost" className="h-8 px-2" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <Pencil className="size-3.5" aria-hidden /> Edit
            </Button>
          )}
        </div>
      </div>
      {f ? (
        <>
          <ul className="mt-2 space-y-1.5">
            {f.usages.map((u, i) => (
              <UsageSummary key={i} u={u} />
            ))}
          </ul>
          {f.apiDurationS !== null || f.wallDurationS !== null ? (
            <p className="mt-2 text-xs text-muted">
              API <span className="num">{formatDuration(f.apiDurationS ?? null)}</span> · wall{" "}
              <span className="num">{formatDuration(f.wallDurationS ?? null)}</span>
            </p>
          ) : null}
        </>
      ) : null}
      {item.error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {item.error}
        </p>
      ) : null}
      {open && !item.already ? (
        <div className="mt-3 border-t border-border pt-3">
          <StepFieldsForm value={edit ?? stepToForm(base)} onChange={(next) => onEdit(next)} />
          {edit ? (
            <div className="mt-3">
              <Button variant="ghost" onClick={() => onEdit(undefined)}>
                Reset to what was pasted
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** What the paste was understood as: each step with its numbers, warnings, and per-step editing. */
export function PastePreview({
  items,
  warnings,
  edits,
  onEdit,
  alreadyCount,
  newCount,
}: {
  items: PreviewItem[];
  warnings: { line: number; message: string }[];
  edits: Record<string, StepForm>;
  onEdit: (key: string, form: StepForm | undefined) => void;
  alreadyCount: number;
  newCount: number;
}) {
  if (items.length === 0 && warnings.length === 0) return null;
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="text-sm text-muted">
        {items.length} {items.length === 1 ? "step" : "steps"} understood
        {alreadyCount ? ` · ${alreadyCount} already added` : ""} · <span className="font-medium text-text">{newCount} new</span>
      </p>
      {warnings.length ? (
        <ul className="space-y-1 rounded-card border border-border bg-accent-soft px-3.5 py-3 text-sm">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-text">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              <span>
                <span className="text-muted">Line {w.line}: </span>
                {w.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <PreviewStep key={item.index} item={item} edit={edits[item.baseFp]} onEdit={(f) => onEdit(item.baseFp, f)} />
        ))}
      </ul>
    </div>
  );
}
