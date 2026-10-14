"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteStepAction, moveStepAction, restoreStepAction } from "@/actions/steps";
import { showUndo } from "@/lib/undo-toast";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./ui/dropdown-menu";

export function StepMenu({
  stepId,
  slug,
  title,
  index,
  count,
}: {
  stepId: string;
  slug: string;
  title: string;
  index: number;
  count: number;
}) {
  return (
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
  );
}
