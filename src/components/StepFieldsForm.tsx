"use client";

import { Plus, Trash2 } from "lucide-react";
import { emptyUsageForm, type StepForm, type UsageForm } from "@/lib/step-form";
import { Button } from "./ui/button";
import { Field, Input, Select, Textarea } from "./ui/input";

const EFFORTS = ["", "low", "medium", "high", "xhigh", "max"];

/** Every field of one step: title, phase, sub-group, notes, durations and each model line. */
export function StepFieldsForm({ value, onChange }: { value: StepForm; onChange: (next: StepForm) => void }) {
  const set = <K extends keyof StepForm>(key: K, v: StepForm[K]) => onChange({ ...value, [key]: v });
  const setUsage = (i: number, patch: Partial<UsageForm>) =>
    set(
      "usages",
      value.usages.map((u, j) => (j === i ? { ...u, ...patch } : u)),
    );

  return (
    <div className="space-y-4">
      <Field label="Title">
        <Input value={value.title} onChange={(e) => set("title", e.target.value)} maxLength={300} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phase">
          <Input value={value.phase} onChange={(e) => set("phase", e.target.value)} maxLength={100} />
        </Field>
        <Field label="Sub-group (optional)">
          <Input value={value.subGroup} onChange={(e) => set("subGroup", e.target.value)} maxLength={100} placeholder="Phase 0" />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <Textarea rows={2} value={value.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="API duration (optional)">
          <Input value={value.api} onChange={(e) => set("api", e.target.value)} placeholder="3m 56s" className="num" />
        </Field>
        <Field label="Wall duration (optional)">
          <Input value={value.wall} onChange={(e) => set("wall", e.target.value)} placeholder="2h 14m 22s" className="num" />
        </Field>
      </div>

      <div className="space-y-3">
        {value.usages.map((u, i) => (
          <fieldset key={i} className="rounded-card border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted">Model line {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Field label="Model">
                <Input value={u.model} onChange={(e) => setUsage(i, { model: e.target.value })} placeholder="claude-opus-5-5" className="num" />
              </Field>
              <Field label="Effort">
                <Select value={u.effort} onChange={(e) => setUsage(i, { effort: e.target.value })}>
                  {EFFORTS.map((x) => (
                    <option key={x} value={x}>
                      {x === "" ? "None" : x === "xhigh" ? "xHigh" : x.charAt(0).toUpperCase() + x.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  ["Input", "input"],
                  ["Output", "output"],
                  ["Cache read", "cacheRead"],
                  ["Cache write", "cacheWrite"],
                ] as const
              ).map(([label, key]) => (
                <Field key={key} label={label}>
                  <Input value={u[key]} onChange={(e) => setUsage(i, { [key]: e.target.value })} className="num" inputMode="decimal" />
                </Field>
              ))}
              <Field label="Cost ($, blank = est.)">
                <Input value={u.cost} onChange={(e) => setUsage(i, { cost: e.target.value })} className="num" inputMode="decimal" placeholder="5.68" />
              </Field>
            </div>
            {value.usages.length > 1 ? (
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" onClick={() => set("usages", value.usages.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" aria-hidden /> Remove line
                </Button>
              </div>
            ) : null}
          </fieldset>
        ))}
        <Button variant="secondary" onClick={() => set("usages", [...value.usages, emptyUsageForm()])}>
          <Plus className="size-4" aria-hidden /> Add model line
        </Button>
      </div>
    </div>
  );
}
