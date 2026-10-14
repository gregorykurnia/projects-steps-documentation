export type ModelFamily = "opus" | "sonnet" | "haiku" | "other";

/** "claude-opus-5-5" → "Opus 5.5". Unreadable ids are shown as they are. */
export function modelLabel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  if (!m) return id;
  return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}`;
}

export function modelFamily(id: string): ModelFamily {
  const m = /^claude-(opus|sonnet|haiku)-/.exec(id);
  return m ? (m[1] as ModelFamily) : "other";
}

const EFFORT: Record<string, string> = { low: "Low", medium: "Medium", high: "High", xhigh: "xHigh", max: "Max" };
export const effortLabel = (effort: string) => EFFORT[effort] ?? effort;

export const modelWithEffort = (model: string, effort: string | null) =>
  effort ? `${modelLabel(model)} · ${effortLabel(effort)}` : modelLabel(model);
