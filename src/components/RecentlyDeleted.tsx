"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { restoreProjectAction } from "@/actions/projects";
import { restoreStepAction } from "@/actions/steps";
import { formatDate } from "@/lib/format";
import { Button } from "./ui/button";

export type DeletedItem = { id: string; title: string; deletedAt: string };

/** Soft-deleted steps or projects from the last 30 days, each with Restore. */
export function RecentlyDeleted({ kind, items }: { kind: "step" | "project"; items: DeletedItem[] }) {
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;

  return (
    <details className="mt-10 text-sm">
      <summary className="cursor-pointer text-muted hover:text-text">Recently deleted ({items.length})</summary>
      <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-surface">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-text">{it.title}</p>
              <p className="text-xs text-muted">Deleted {formatDate(new Date(it.deletedAt))}. Kept for 30 days.</p>
            </div>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await (kind === "step" ? restoreStepAction(it.id) : restoreProjectAction(it.id));
                  toast.success("Restored");
                })
              }
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}
