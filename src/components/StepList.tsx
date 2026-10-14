import { groupSteps } from "@/lib/steps-view";
import type { StepWithUsages } from "@/db/queries";
import { StepRow } from "./StepRow";
import { Card } from "./ui/card";

/** The project's steps, grouped by phase and sub-group. `renderMenu` adds each step's actions. */
export function StepList({
  steps,
  renderMenu,
}: {
  steps: StepWithUsages[];
  renderMenu?: (step: StepWithUsages, index: number, count: number) => React.ReactNode;
}) {
  const sections = groupSteps(steps);
  return (
    <div className="space-y-8">
      {sections.map((section, si) => (
        <section key={`${section.phase}-${si}`} aria-label={section.phase}>
          <h2 className="mb-3 text-sm font-semibold text-text">{section.phase}</h2>
          <div className="space-y-4">
            {section.groups.map((g, gi) => (
              <div key={`${g.subGroup}-${gi}`}>
                {g.subGroup ? (
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{g.subGroup}</h3>
                ) : null}
                <Card className="overflow-hidden">
                  {g.steps.map((s) => (
                    <StepRow key={s.id} step={s} number={s.number} menu={renderMenu?.(s, s.number - 1, steps.length)} />
                  ))}
                </Card>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
