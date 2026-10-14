import { durationToText, parseCostText, parseCount, parseDurationText } from "./inputs";
import type { Effort } from "./parse-notes";
import type { StepFieldsInput } from "./schemas";

/** Text-box state for one model line. Numbers stay strings so half-typed values aren't lost. */
export type UsageForm = {
  model: string;
  effort: string;
  input: string;
  output: string;
  cacheRead: string;
  cacheWrite: string;
  cost: string;
};

export type StepForm = {
  title: string;
  phase: string;
  subGroup: string;
  notes: string;
  api: string;
  wall: string;
  usages: UsageForm[];
};

export const emptyUsageForm = (): UsageForm => ({
  model: "",
  effort: "",
  input: "0",
  output: "0",
  cacheRead: "0",
  cacheWrite: "0",
  cost: "",
});

type FieldsLike = {
  title: string;
  phase: string;
  subGroup?: string | null;
  notes?: string | null;
  apiDurationS: number | null;
  wallDurationS: number | null;
  usages: {
    model: string;
    effort: string | null;
    inputTokens: number;
    outputTokens: number;
    cacheRead: number;
    cacheWrite: number;
    costUsd: number | null;
  }[];
};

export function stepToForm(f: FieldsLike): StepForm {
  return {
    title: f.title,
    phase: f.phase,
    subGroup: f.subGroup ?? "",
    notes: f.notes ?? "",
    api: durationToText(f.apiDurationS),
    wall: durationToText(f.wallDurationS),
    usages: f.usages.map((u) => ({
      model: u.model,
      effort: u.effort ?? "",
      input: String(u.inputTokens),
      output: String(u.outputTokens),
      cacheRead: String(u.cacheRead),
      cacheWrite: String(u.cacheWrite),
      cost: u.costUsd === null ? "" : String(u.costUsd),
    })),
  };
}

type Result = { ok: true; value: StepFieldsInput } | { ok: false; error: string };

export function formToFields(form: StepForm): Result {
  const fail = (error: string): Result => ({ ok: false, error });
  if (!form.title.trim()) return fail("Title can't be empty");
  if (!form.phase.trim()) return fail("Phase can't be empty");
  if (form.usages.length === 0) return fail("Add at least one model line");

  const api = form.api.trim() ? parseDurationText(form.api) : null;
  if (form.api.trim() && api === null) return fail("API duration: use a format like 3m 56s");
  const wall = form.wall.trim() ? parseDurationText(form.wall) : null;
  if (form.wall.trim() && wall === null) return fail("Wall duration: use a format like 2h 14m 22s");

  const usages: StepFieldsInput["usages"] = [];
  for (const [i, u] of form.usages.entries()) {
    const n = `Model line ${i + 1}`;
    if (!/^claude-[a-z0-9-]+$/i.test(u.model.trim())) return fail(`${n}: model must look like claude-opus-5-5`);
    const counts: [string, string][] = [
      ["input", u.input],
      ["output", u.output],
      ["cache read", u.cacheRead],
      ["cache write", u.cacheWrite],
    ];
    const parsed: number[] = [];
    for (const [label, text] of counts) {
      const v = text.trim() ? parseCount(text) : 0;
      if (v === null) return fail(`${n}: ${label} isn't a number`);
      parsed.push(v);
    }
    const cost = u.cost.trim() ? parseCostText(u.cost) : null;
    if (u.cost.trim() && cost === null) return fail(`${n}: cost isn't a number`);
    usages.push({
      model: u.model.trim().toLowerCase(),
      effort: (u.effort || null) as Effort | null,
      inputTokens: parsed[0],
      outputTokens: parsed[1],
      cacheRead: parsed[2],
      cacheWrite: parsed[3],
      costUsd: cost,
    });
  }

  return {
    ok: true,
    value: {
      title: form.title.trim(),
      phase: form.phase.trim(),
      subGroup: form.subGroup.trim() || null,
      notes: form.notes.trim() || null,
      apiDurationS: api,
      wallDurationS: wall,
      usages,
    },
  };
}
