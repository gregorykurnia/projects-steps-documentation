// Parsers for the text boxes in the step forms. They accept the same shorthand as the pasted notes.

/** "534", "29.8k", "4.7M", "1,234" → whole tokens; null when empty or unreadable. */
export function parseCount(text: string): number | null {
  const m = /^\s*(\d[\d,]*(?:\.\d+)?)\s*([km])?\s*$/i.exec(text);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2]?.toLowerCase() === "k" ? 1_000 : 1;
  return Math.round(n * mult);
}

/** "45s", "3m 56s", "2h 14m 22s", or plain seconds → seconds; null when empty or unreadable. */
export function parseDurationText(text: string): number | null {
  if (/^\s*\d+\s*$/.test(text)) return parseInt(text, 10);
  if (!/^\s*(?:\d+\s*[hms]\s*)+$/i.test(text)) return null;
  let total = 0;
  for (const m of text.matchAll(/(\d+)\s*([hms])/gi)) {
    const unit = m[2].toLowerCase();
    total += parseInt(m[1], 10) * (unit === "h" ? 3600 : unit === "m" ? 60 : 1);
  }
  return total;
}

/** Exact, editable form of a duration (the display format drops seconds above an hour). */
export function durationToText(seconds: number | null): string {
  if (seconds === null) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [h ? `${h}h` : "", m ? `${m}m` : "", s || (!h && !m) ? `${s}s` : ""].filter(Boolean);
  return parts.join(" ");
}

/** "$5.68" or "5.68" → 5.68; null when empty or unreadable. */
export function parseCostText(text: string): number | null {
  const m = /^\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*$/.exec(text);
  return m ? parseFloat(m[1].replace(/,/g, "")) : null;
}
