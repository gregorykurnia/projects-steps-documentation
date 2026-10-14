import Link from "next/link";
import { formatDate, formatTokens } from "@/lib/format";
import type { ProjectSummary } from "@/db/queries";
import { Cost } from "./Cost";
import { StatusChip } from "./StatusChip";
import { Card } from "./ui/card";

export function ProjectCard({ p }: { p: ProjectSummary }) {
  return (
    <Link href={`/p/${p.slug}`} className="group block rounded-card">
      <Card className="h-full px-4 py-4 transition-colors group-hover:border-accent">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-text">{p.name}</h2>
          <StatusChip status={p.status} />
        </div>
        <p className="mt-1 line-clamp-1 min-h-5 text-sm text-muted">{p.description ?? ""}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Steps</dt>
            <dd className="num mt-0.5 text-text">{p.stepCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Cost</dt>
            <dd className="mt-0.5 text-text"><Cost total={p.totalCost} estimated={p.estimatedCost} align="start" /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Output</dt>
            <dd className="num mt-0.5 text-text">{p.stepCount ? formatTokens(p.outputTokens) : "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">Updated {formatDate(p.updatedAt)}</p>
      </Card>
    </Link>
  );
}
