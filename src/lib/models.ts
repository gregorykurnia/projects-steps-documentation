export type ModelFamily = "opus" | "sonnet" | "haiku" | "other";

/** The model ids the site reads and saves: Claude ones, and the GPT ones Codex runs ("gpt-6.1-sol"). */
export const MODEL_ID_SOURCE = "claude-[a-z0-9-]+|gpt-[a-z0-9]+(?:[.-][a-z0-9]+)*";
const MODEL_ID_RE = new RegExp(`^(?:${MODEL_ID_SOURCE})$`, "i");
export const isModelId = (id: string) => MODEL_ID_RE.test(id);
export const isGpt = (id: string) => /^gpt-/i.test(id);

const capitalise = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

/** "claude-opus-5-5" → "Opus 5.5", "gpt-6.1-sol" → "GPT-6.1 Sol". Unreadable ids are shown as they are. */
export function modelLabel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  if (m) return `${capitalise(m[1])} ${m[2]}.${m[3]}`;
  const g = /^gpt-(\d+(?:\.\d+)?)-([a-z]+)$/.exec(id);
  if (g) return `GPT-${g[1]} ${capitalise(g[2])}`;
  return id;
}

export function modelFamily(id: string): ModelFamily {
  const m = /^claude-(opus|sonnet|haiku)-/.exec(id);
  return m ? (m[1] as ModelFamily) : "other";
}

const EFFORT: Record<string, string> = { low: "Low", medium: "Medium", high: "High", xhigh: "xHigh", max: "Max" };
export const effortLabel = (effort: string) => EFFORT[effort] ?? effort;

export const modelWithEffort = (model: string, effort: string | null) =>
  effort ? `${modelLabel(model)} · ${effortLabel(effort)}` : modelLabel(model);
