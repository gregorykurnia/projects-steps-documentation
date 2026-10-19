"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "./ui/dropdown-menu";

export type SwitcherProject = { id: string; name: string; slug: string };

/**
 * The current project's name; opens a menu to jump to another project.
 * `hrefSuffix` keeps you on the same sub-page (e.g. "/settings"). `compact` is the small version
 * shown above a page title.
 */
export function ProjectSwitcher({
  currentId,
  projects,
  hrefSuffix = "",
  compact,
}: {
  currentId: string;
  projects: SwitcherProject[];
  hrefSuffix?: string;
  compact?: boolean;
}) {
  const current = projects.find((p) => p.id === currentId);
  if (!current) return null;
  return (
    <Menu>
      <MenuTrigger
        title="Switch project"
        className={clsx(
          "inline-flex items-center rounded-lg text-left hover:bg-accent-soft data-[state=open]:bg-accent-soft",
          compact ? "-mx-1 gap-1 px-1 hover:text-text data-[state=open]:text-text" : "-mx-1.5 gap-1.5 px-1.5",
        )}
      >
        <span className="min-w-0 break-words">{current.name}</span>
        <ChevronsUpDown className={clsx("shrink-0 text-muted", compact ? "size-3.5" : "size-5")} aria-hidden />
      </MenuTrigger>
      <MenuContent align="start" className="max-h-[min(24rem,70dvh)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto">
        <MenuLabel>Switch project</MenuLabel>
        {projects.map((p) => {
          const isCurrent = p.id === current.id;
          return (
            <MenuItem key={p.id} asChild>
              <Link href={`/p/${p.slug}${hrefSuffix}`} aria-current={isCurrent ? "page" : undefined}>
                <Check className={isCurrent ? "size-4 shrink-0 text-accent" : "size-4 shrink-0 invisible"} aria-hidden />
                <span className="truncate">{p.name}</span>
              </Link>
            </MenuItem>
          );
        })}
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/">
            <LayoutGrid className="size-4 shrink-0" aria-hidden /> All projects
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/new">
            <Plus className="size-4 shrink-0" aria-hidden /> New project
          </Link>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
