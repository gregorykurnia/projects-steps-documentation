const DASH = "—";

/** 534 → "534", 29,800 → "29.8k", 4,700,000 → "4.7M". */
export function formatTokens(n: number | null | undefined): string {
  if (n === null || n === undefined) return DASH;
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function formatExactTokens(n: number | null | undefined): string {
  if (n === null || n === undefined) return DASH;
  return n.toLocaleString("en-US");
}

/** 5.68 → "$5.68". With `est` the value is labelled as an estimate. */
export function formatCost(usd: number | null | undefined, opts: { est?: boolean } = {}): string {
  if (usd === null || usd === undefined) return DASH;
  const text = usd > 0 && usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`;
  return opts.est ? `${text} est.` : text;
}

/** 45 → "45s", 236 → "3m 56s", 8062 → "2h 14m". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return DASH;
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m}m ${r}s` : `${m}m`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
