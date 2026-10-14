export type ParsedUsage = {
  model: string;
  effort: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number | null;
};

export type ParsedStep = {
  title: string;
  phase: string;
  subGroup: string | null;
  usages: ParsedUsage[];
  apiDurationS: number | null;
  wallDurationS: number | null;
  sourceText: string;
  /** 1-based line the step starts on. */
  line: number;
};

export type ParseWarning = { line: number; message: string };

export type ParseResult = {
  projectName?: string;
  steps: ParsedStep[];
  warnings: ParseWarning[];
};

export const DEFAULT_PHASE = "Planning & design";

const MODEL_RE = /(claude-[a-z0-9-]+)(?:\s+(low|medium|high|xhigh|max))?\s*:\s*/i;
const TOKENS_RE = /(\d[\d,]*(?:\.\d+)?)\s*([km])?\s+(input|output|cache\s+read|cache\s+write)\b/gi;
const COST_RE = /\(\s*\$\s*(\d[\d,]*(?:\.\d+)?)\s*\)/;
const DURATION_RE = /total duration\s*\((api|wall)\)\s*:\s*((?:\d+\s*[hms]\s*)+)/gi;

function toTokens(num: string, suffix: string | undefined): number {
  const n = parseFloat(num.replace(/,/g, ""));
  const mult = suffix?.toLowerCase() === "m" ? 1_000_000 : suffix?.toLowerCase() === "k" ? 1_000 : 1;
  return Math.round(n * mult);
}

function toSeconds(text: string): number {
  let total = 0;
  for (const m of text.matchAll(/(\d+)\s*([hms])/gi)) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    total += unit === "h" ? n * 3600 : unit === "m" ? n * 60 : n;
  }
  return total;
}

function parseDurations(line: string): { api: number | null; wall: number | null } {
  const out = { api: null as number | null, wall: null as number | null };
  for (const m of line.matchAll(DURATION_RE)) {
    out[m[1].toLowerCase() === "api" ? "api" : "wall"] = toSeconds(m[2]);
  }
  return out;
}

const stripColon = (s: string) => s.trim().replace(/:\s*$/, "").trim();

function sentenceCase(s: string): string {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

type ModelLine = {
  titlePrefix: string;
  usage: ParsedUsage;
  api: number | null;
  wall: number | null;
};

function parseModelLine(line: string): ModelLine | null {
  const m = MODEL_RE.exec(line);
  if (!m) return null;
  const rest = line.slice(m.index + m[0].length);
  const usage: ParsedUsage = {
    model: m[1].toLowerCase(),
    effort: m[2] ? m[2].toLowerCase() : null,
    inputTokens: 0,
    outputTokens: 0,
    cacheRead: 0,
    cacheWrite: 0,
    costUsd: null,
  };
  let found = false;
  for (const t of rest.matchAll(TOKENS_RE)) {
    found = true;
    const kind = t[3].toLowerCase().replace(/\s+/, " ");
    const value = toTokens(t[1], t[2]);
    if (kind === "input") usage.inputTokens = value;
    else if (kind === "output") usage.outputTokens = value;
    else if (kind === "cache read") usage.cacheRead = value;
    else usage.cacheWrite = value;
  }
  if (!found) return null;
  const cost = COST_RE.exec(rest);
  if (cost) usage.costUsd = parseFloat(cost[1].replace(/,/g, ""));
  const { api, wall } = parseDurations(rest);
  return { titlePrefix: stripColon(line.slice(0, m.index)), usage, api, wall };
}

/** Turns pasted notes into steps. Pure: no I/O, safe to run in the browser. */
export function parseNotes(text: string): ParseResult {
  const steps: ParsedStep[] = [];
  const warnings: ParseWarning[] = [];
  let projectName: string | undefined;
  let phase = DEFAULT_PHASE;
  let subGroup: string | null = null;
  let pending: { title: string; line: number; raw: string } | null = null;
  let current: ParsedStep | null = null;
  let firstTextLine: number | null = null;

  const dropPending = () => {
    if (pending) {
      warnings.push({ line: pending.line, message: `no usage found for “${pending.title}”` });
      pending = null;
    }
  };

  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.trim();
    if (!line) return;
    if (firstTextLine === null) firstTextLine = lineNo;

    const model = parseModelLine(line);
    if (model) {
      if (model.titlePrefix) {
        dropPending();
        current = {
          title: model.titlePrefix,
          phase,
          subGroup,
          usages: [model.usage],
          apiDurationS: model.api,
          wallDurationS: model.wall,
          sourceText: line,
          line: lineNo,
        };
        steps.push(current);
      } else if (pending) {
        current = {
          title: pending.title,
          phase,
          subGroup,
          usages: [model.usage],
          apiDurationS: model.api,
          wallDurationS: model.wall,
          sourceText: `${pending.raw}\n${line}`,
          line: pending.line,
        };
        steps.push(current);
        pending = null;
      } else if (current) {
        current.usages.push(model.usage);
        current.sourceText += `\n${line}`;
        if (model.api !== null) current.apiDurationS = model.api;
        if (model.wall !== null) current.wallDurationS = model.wall;
      } else {
        warnings.push({ line: lineNo, message: `model line without a step title: ${line}` });
      }
      return;
    }

    if (/^total duration\b/i.test(line)) {
      const { api, wall } = parseDurations(line);
      if (current) {
        if (api !== null) current.apiDurationS = api;
        if (wall !== null) current.wallDurationS = wall;
        current.sourceText += `\n${line}`;
      } else {
        warnings.push({ line: lineNo, message: `durations without a step: ${line}` });
      }
      return;
    }

    const heading = stripColon(line);
    if (/^phase\b/i.test(heading)) {
      dropPending();
      current = null;
      subGroup = heading;
      return;
    }
    if (/[a-z]/i.test(heading) && heading === heading.toUpperCase()) {
      dropPending();
      current = null;
      phase = sentenceCase(heading);
      subGroup = null;
      return;
    }

    // Plain text: the title of the next step.
    if (pending) {
      if (pending.line === firstTextLine && steps.length === 0 && projectName === undefined) {
        projectName = pending.title;
      } else {
        dropPending();
      }
    }
    current = null;
    pending = { title: heading, line: lineNo, raw: line };
  });

  dropPending();
  return projectName === undefined ? { steps, warnings } : { projectName, steps, warnings };
}
