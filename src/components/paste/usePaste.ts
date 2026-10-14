"use client";

import { useDeferredValue, useMemo } from "react";
import { parseNotes } from "@/lib/parse-notes";
import { previewItems } from "@/lib/preview";
import type { StepForm } from "@/lib/step-form";

export type { PreviewItem } from "@/lib/preview";

/** Parses pasted notes live and works out which steps are new. Pure derivation: nothing is saved. */
export function usePaste(text: string, knownFingerprints: string[], edits: Record<string, StepForm>) {
  const deferred = useDeferredValue(text);
  const parsed = useMemo(() => parseNotes(deferred), [deferred]);
  const known = useMemo(() => new Set(knownFingerprints), [knownFingerprints]);
  const items = useMemo(() => previewItems(parsed.steps, known, edits), [parsed, known, edits]);

  return {
    parsed,
    items,
    toAdd: items.filter((i) => i.fields && !i.error && !i.already),
    alreadyCount: items.filter((i) => i.already).length,
    pending: deferred !== text,
  };
}
