import { Plus } from "lucide-react";
import { listProjects, usageRows } from "@/db/queries";
import { statsByModel } from "@/lib/stats";
import { formatDuration, formatExactTokens, formatTokens } from "@/lib/format";
import { Cost } from "@/components/Cost";
import { EstimateNote } from "@/components/EstimateNote";
import { ModelStatsTable } from "@/components/ModelStatsTable";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/ProjectCard";
import { StatTile } from "@/components/StatTile";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [projects, rows] = await Promise.all([listProjects(), usageRows()]);
  const byModelEffort = statsByModel(rows, { groupBy: "model+effort" });
  const byModel = statsByModel(rows, { groupBy: "model" });
  const t = byModel.total;
  const allTokens = t.inputTokens + t.outputTokens + t.cacheRead + t.cacheWrite;
  const newProject = (
    <LinkButton href="/new" variant="primary">
      <Plus className="size-4" aria-hidden /> New project
    </LinkButton>
  );

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="All projects" actions={newProject} />
        <p className="text-sm text-muted">No projects yet. Create one and paste your notes to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="All projects" description="Models, tokens, cost and time across every project." actions={newProject} />

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total cost" value={<Cost total={t.totalCost} estimated={t.estimatedCost} align="start" />} />
        <StatTile
          label="Tokens"
          value={<span title={formatExactTokens(allTokens)}>{formatTokens(allTokens)}</span>}
          sub={`${formatTokens(t.outputTokens)} output`}
        />
        <StatTile label="Steps" value={t.steps} sub={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`} />
        <StatTile
          label="API time"
          value={formatDuration(t.apiDurationS)}
          sub={`${t.durationApprox ? "≈ " : ""}${formatDuration(t.wallDurationS)} wall`}
        />
      </section>

      <section aria-label="Projects" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </section>

      <section aria-label="All projects, by model" className="mt-8">
        <ModelStatsTable title="All projects, by model" byModelEffort={byModelEffort} byModel={byModel} />
        <EstimateNote />
      </section>
    </div>
  );
}
