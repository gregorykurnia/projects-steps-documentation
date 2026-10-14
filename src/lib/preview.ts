import { stepFingerprint } from "./fingerprint";
import type { ParsedStep } from "./parse-notes";
import { stepFieldsSchema, type StepFieldsInput } from "./schemas";
import { formToFields, type StepForm } from "./step-form";

export type PreviewItem = {
  index: number;
  parsed: ParsedStep;
  /** Fingerprint of the step as pasted, before any edit. Edits are kept under this key. */
  baseFp: string;
  /** The step as it will be saved (after any edit); null while it can't be saved. */
  fields: StepFieldsInput | null;
  error: string | null;
  /** Same title and numbers as a step already in the project (or earlier in this paste). */
  already: boolean;
};

export const baseFingerprint = (p: Pick<ParsedStep, "title" | "usages">) => stepFingerprint(p.title, p.usages);

function describe(issue: { path: PropertyKey[]; message: string }): string {
  const where = issue.path.map(String).join(" ");
  return where ? `${where}: ${issue.message}` : issue.message;
}

/**
 * What each pasted step will become. Edits are keyed by the step's original fingerprint, so they
 * survive more text being pasted above or below. A step that breaks a field limit gets an error
 * and is left out, without blocking the others.
 */
export function previewItems(
  steps: ParsedStep[],
  known: Set<string>,
  edits: Record<string, StepForm>,
): PreviewItem[] {
  const seen = new Set(known);
  return steps.map((parsed, index) => {
    const baseFp = baseFingerprint(parsed);
    let candidate: StepFieldsInput | null = {
      title: parsed.title,
      phase: parsed.phase,
      subGroup: parsed.subGroup,
      notes: null,
      apiDurationS: parsed.apiDurationS,
      wallDurationS: parsed.wallDurationS,
      usages: parsed.usages,
    };
    let error: string | null = null;
    const edit = edits[baseFp];
    if (edit) {
      const r = formToFields(edit);
      if (r.ok) candidate = r.value;
      else {
        candidate = null;
        error = r.error;
      }
    }
    let fields: StepFieldsInput | null = null;
    if (candidate) {
      const checked = stepFieldsSchema.safeParse(candidate);
      if (checked.success) fields = checked.data;
      else error = describe(checked.error.issues[0]);
    }
    const fp = fields ? stepFingerprint(fields.title, fields.usages) : null;
    const already = fp ? seen.has(fp) : false;
    if (fp) seen.add(fp);
    return { index, parsed, baseFp, fields, error, already };
  });
}
