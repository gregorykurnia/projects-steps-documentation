import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { pasteTextSchema } from "./schemas";

/** The body autorun sends to `POST /api/steps`: a project name or slug, and notes in the paste format. */
export const ingestBodySchema = z.object({
  project: z.string().trim().min(1).max(120),
  text: pasteTextSchema.refine((t) => t.trim().length > 0, "text is empty"),
});

export type KeyCheck = "ok" | "off" | "wrong";

/**
 * Checks an `Authorization: Bearer <key>` header against the configured key. "off" when no key is
 * configured, so the endpoint stays closed until one is set. Hashing first makes the comparison
 * constant-time whatever the lengths.
 */
export function checkIngestKey(header: string | null, configured: string | undefined): KeyCheck {
  if (!configured) return "off";
  const sent = header?.match(/^Bearer\s+(.+)$/i)?.[1].trim() ?? "";
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return sent && timingSafeEqual(digest(sent), digest(configured)) ? "ok" : "wrong";
}
