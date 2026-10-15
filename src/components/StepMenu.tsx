"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteStepAction,
  moveStepAction,
  moveStepToProjectAction,
  restoreStepAction,
} from "@/actions/steps";
import { showUndo } from "@/lib/undo-toast";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./ui/dropdown-menu";
import { Sheet } from "./ui/sheet";

export type MoveTarget = { id: string; name: string; slug: string };

export function StepMenu({
  stepId,
  slug,
  title,
  index,
  count,
  moveTargets,
}: {
  stepId: string;
  slug: string;
  title: string;
  index: number;
  count: number;
  moveTargets: MoveTarget[];
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [movingTo, setMovingTo] = useState<string | null>(null);

  async function moveTo(target: MoveTarget) {
    setMovingTo(target.id);
    try {
      const r = await moveStepToProjectAction(stepId, target.id);
      setMoveOpen(false);
      showUndo(`Step moved to ${r.toName}`, () =>
        moveStepToProjectAction(stepId, r.fromProjectId, r.fromPosition),
      );
    } catch {
      toast.error("Couldn't move that step");
    } finally {
      setMovingTo(null);
    }
  }

  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label={`Actions for ${title}`}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-accent-soft hover:text-text"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </MenuTrigger>
        <MenuContent>
          <MenuItem asChild>
            <Link href={`/p/${slug}/steps/${stepId}`}>
              <Pencil className="size-4" aria-hidden /> Edit
            </Link>
          </MenuItem>
          <MenuItem disabled={index === 0} onSelect={() => moveStepAction(stepId, "up")}>
            <ArrowUp className="size-4" aria-hidden /> Move up
          </MenuItem>
          <MenuItem disabled={index === count - 1} onSelect={() => moveStepAction(stepId, "down")}>
            <ArrowDown className="size-4" aria-hidden /> Move down
          </MenuItem>
          <MenuItem onSelect={() => setMoveOpen(true)}>
            <FolderInput className="size-4" aria-hidden /> Move to project…
          </MenuItem>
          <MenuItem
            danger
            onSelect={async () => {
              await deleteStepAction(stepId);
              showUndo("Step deleted", () => restoreStepAction(stepId));
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </MenuItem>
        </MenuContent>
      </Menu>
      <Sheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title="Move to project"
        description={`“${title}” leaves this project and goes to the end of the one you pick.`}
      >
        <div className="flex-1 overflow-y-auto p-5">
          {moveTargets.length === 0 ? (
            <p className="text-sm text-muted">There are no other projects to move it to.</p>
          ) : (
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {moveTargets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={movingTo !== null}
                    onClick={() => moveTo(t)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-text hover:bg-accent-soft disabled:opacity-50"
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {movingTo === t.id ? "Moving…" : "Move here"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
    </>
  );
}
