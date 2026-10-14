import { estimateCost } from "./pricing";

type CostableUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number | null;
};

/** The recorded cost of a model line, else an estimate (flagged), else nothing. */
export function usageCost(u: CostableUsage): { value: number | null; estimated: boolean } {
  if (u.costUsd !== null) return { value: u.costUsd, estimated: false };
  const est = estimateCost(u);
  return { value: est, estimated: est !== null };
}

export function stepCost(usages: CostableUsage[]): { recorded: number; estimated: number; total: number | null } {
  let recorded = 0;
  let estimated = 0;
  let any = false;
  for (const u of usages) {
    const c = usageCost(u);
    if (c.value === null) continue;
    any = true;
    if (c.estimated) estimated += c.value;
    else recorded += c.value;
  }
  return { recorded, estimated, total: any ? recorded + estimated : null };
}

type Grouped<T> = T & { number: number };
export type PhaseSection<T> = {
  phase: string;
  groups: { subGroup: string | null; steps: Grouped<T>[] }[];
};

/** Sections by phase, then sub-group, over consecutive steps; steps are numbered across the project. */
export function groupSteps<T extends { phase: string; subGroup: string | null }>(list: T[]): PhaseSection<T>[] {
  const sections: PhaseSection<T>[] = [];
  list.forEach((s, i) => {
    let section = sections.at(-1);
    if (!section || section.phase !== s.phase) {
      section = { phase: s.phase, groups: [] };
      sections.push(section);
    }
    let group = section.groups.at(-1);
    if (!group || group.subGroup !== s.subGroup) {
      group = { subGroup: s.subGroup, steps: [] };
      section.groups.push(group);
    }
    group.steps.push({ ...s, number: i + 1 });
  });
  return sections;
}
