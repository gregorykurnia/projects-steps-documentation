import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { existingFingerprints, getProjectBySlug, getProjectSteps, listMoveTargets, listProjectLinks, listRecentlyDeletedSteps, usageRows } from "@/db/queries";
import { statsByModel } from "@/lib/stats";
import { stepCost } from "@/lib/steps-view";
import { formatDate, formatDuration, formatExactTokens, formatTokens } from "@/lib/format";
import { Cost } from "@/components/Cost";
import { CostBars } from "@/components/CostBars";
import { EstimateNote } from "@/components/EstimateNote";
import { ModelStatsTable } from "@/components/ModelStatsTable";
import { PageHeader } from "@/components/PageHeader";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { StatTile } from "@/components/StatTile";
import { StatusChip } from "@/components/StatusChip";
import { PasteSteps } from "@/components/paste/PasteSteps";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";
import { StepList } from "@/components/StepList";
import { StepMenu } from "@/components/StepMenu";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectBySlug((await params).slug);
  return { title: project?.name ?? "Not found" };
}

function dateRange(dates: Date[]): string | null {
  if (!dates.length) return null;
  const t = dates.map((d) => d.getTime());
  const a = formatDate(new Date(Math.min(...t)));
  const b = formatDate(new Date(Math.max(...t)));
  return a === b ? a : `${a} – ${b}`;
}

export default async function ProjectPage({ params }: Props) {
  const project = await getProjectBySlug((await params).slug);
  if (!project) notFound();

  const [steps, rows, fingerprints, deleted, moveTargets, projectLinks] = await Promise.all([
    getProjectSteps(project.id),
    usageRows(project.id),
    existingFingerprints(project.id),
    listRecentlyDeletedSteps(project.id),
    listMoveTargets(project.id),
    listProjectLinks(),
  ]);
  const byModelEffort = statsByModel(rows, { groupBy: "model+effort" });
  const byModel = statsByModel(rows, { groupBy: "model" });
  const t = byModel.total;
  const hasSteps = steps.length > 0;
  const range = dateRange(steps.map((s) => s.createdAt));
  const tokenTile = (label: string, n: number) => (
    <StatTile label={label} value={<span title={formatExactTokens(n)}>{hasSteps ? formatTokens(n) : "—"}</span>} />
  );

  return (
    <div className="pb-20 sm:pb-0">
      <PageHeader
        title={<ProjectSwitcher currentId={project.id} projects={projectLinks} />}
        description={project.description}
        meta={
          <>
            <StatusChip status={project.status} />
            {range ? <span>{range}</span> : null}
          </>
        }
        actions={
          <>
            <LinkButton href={`/p/${project.slug}/settings`} variant="ghost" aria-label="Project settings">
              <Settings className="size-4" aria-hidden /> <span className="hidden sm:inline">Settings</span>
            </LinkButton>
            <PasteSteps projectId={project.id} fingerprints={fingerprints} />
          </>
        }
      />

      {!hasSteps ? (
        <p className="text-sm text-muted">No steps yet. Use “Paste steps” to add your notes.</p>
      ) : (
        <div className="space-y-8">
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total cost" value={<Cost total={t.totalCost} estimated={t.estimatedCost} align="start" />} />
            {tokenTile("Input", t.inputTokens)}
            {tokenTile("Output", t.outputTokens)}
            {tokenTile("Cache read", t.cacheRead)}
            {tokenTile("Cache write", t.cacheWrite)}
            <StatTile label="API time" value={formatDuration(t.apiDurationS)} />
            <StatTile label="Wall time" value={formatDuration(t.wallDurationS)} />
            <StatTile label="Steps" value={t.steps} />
          </section>

          <section aria-label="Stats per model">
            <ModelStatsTable byModelEffort={byModelEffort} byModel={byModel} />
            <EstimateNote />
          </section>

          <section aria-label="Cost by step">
            <CostBars
              steps={steps.map((s, i) => ({ id: s.id, number: i + 1, title: s.title, ...stepCost(s.usages) }))}
            />
          </section>

          <StepList
            steps={steps}
            renderMenu={(s, i, count) => (
              <StepMenu
                stepId={s.id}
                slug={project.slug}
                title={s.title}
                index={i}
                count={count}
                moveTargets={moveTargets}
              />
            )}
          />
        </div>
      )}

      <RecentlyDeleted
        kind="step"
        items={deleted.map((d) => ({ id: d.id, title: d.title, deletedAt: d.deletedAt!.toISOString() }))}
      />
    </div>
  );
}
