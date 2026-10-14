import { z } from "zod";

/** Every write is validated against these limits (the site is public, so the server never trusts the browser). */
export const MAX_PASTE_CHARS = 100_000;

const tokens = z.number().int().min(0).max(1_000_000_000_000);
const seconds = z.number().int().min(0).max(31_536_000);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const usageSchema = z.object({
  model: z.string().trim().toLowerCase().regex(/^claude-[a-z0-9-]{1,80}$/),
  effort: z.enum(["low", "medium", "high", "xhigh", "max"]).nullable(),
  inputTokens: tokens,
  outputTokens: tokens,
  cacheRead: tokens,
  cacheWrite: tokens,
  costUsd: z.number().min(0).max(1_000_000).nullable(),
});

export const stepFieldsSchema = z.object({
  title: z.string().trim().min(1).max(300),
  phase: z.string().trim().min(1).max(100),
  subGroup: optionalText(100),
  notes: optionalText(2000),
  apiDurationS: seconds.nullable(),
  wallDurationS: seconds.nullable(),
  usages: z.array(usageSchema).min(1).max(10),
});
export type StepFields = z.infer<typeof stepFieldsSchema>;
export type StepFieldsInput = z.input<typeof stepFieldsSchema>;

/**
 * Edits made in the paste preview, keyed by the step's index in the parsed paste. Only the shape is
 * checked here; each merged step is validated against stepFieldsSchema, so one bad edit skips that
 * step instead of rejecting the whole paste.
 */
export const pasteEditsSchema = z.record(z.string().regex(/^\d{1,4}$/), z.record(z.string(), z.unknown()));
export type PasteEdits = Record<string, Partial<StepFieldsInput>>;

export const pasteTextSchema = z.string().max(MAX_PASTE_CHARS);

export const projectFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalText(500),
  status: z.enum(["in_progress", "done"]).default("in_progress"),
});
export type ProjectFieldsInput = z.input<typeof projectFieldsSchema>;
