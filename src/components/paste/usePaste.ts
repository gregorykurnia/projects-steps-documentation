"use client";

import { useDeferredValue, useMemo } from "react";
import { stepFingerprint } from "@/lib/fingerprint";
import { parseNotes, type ParsedStep } from "@/lib/parse-notes";
import type { StepFieldsInput } from "@/lib/schemas";
import { formToFields, type StepForm } from "@/lib/step-form";

export type PreviewItem = {
  index: number;
  parsed: ParsedStep;
  /** The step as it will be saved (after any edits); null while an edit is invalid. */
  fields: StepFieldsInput | null;
  error: string | null;
  /** Same title and numbers as a step already in the project (or earlier in this paste). */
  already: boolean;
};

/** Parses pasted notes live and works out which steps are new. Pure derivation: nothing is saved. */
export function usePaste(text: string, knownFingerprints: string[], edits: Record<number, StepForm>) {
  const deferred = useDeferredValue(text);
  const parsed = useMemo(() => parseNotes(deferred), [deferred]);
  const known = useMemo(() => new Set(knownFingerprints), [knownFingerprints]);

  const items = useMemo<PreviewItem[]>(() => {
    const seen = new Set(known);
    return parsed.steps.map((p, index) => {
      let fields: StepFieldsInput | null = {
        title: p.title,
        phase: p.phase,
        subGroup: p.subGroup,
        notes: null,
        apiDurationS: p.apiDurationS,
        wallDurationS: p.wallDurationS,
        usages: p.usages,
      };
      let error: string | null = null;
      const edit = edits[index];
      if (edit) {
        const r = formToFields(edit);
        if (r.ok) fields = r.value;
        else {
          fields = null;
          error = r.error;
        }
      }
      const fp = fields ? stepFingerprint(fields.title, fields.usages) : null;
      const already = fp ? seen.has(fp) : false;
      if (fp) seen.add(fp);
      return { index, parsed: p, fields, error, already };
    });
  }, [parsed, known, edits]);

  const toAdd = items.filter((i) => !i.already && i.fields);
  const blocked = items.some((i) => i.error);
  return {
    parsed,
    items,
    toAdd,
    blocked,
    alreadyCount: items.filter((i) => i.already).length,
    pending: deferred !== text,
  };
}
