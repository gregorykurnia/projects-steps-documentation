"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "./ui/dropdown-menu";

export type SwitcherProject = { id: string; name: string; slug: string };

/** The project name in the page header; opens a menu to jump to another project. */
export function ProjectSwitcher({ current, projects }: { current: SwitcherProject; projects: SwitcherProject[] }) {
  return (
    <Menu>
      <MenuTrigger
        title="Switch project"
        className="-mx-1.5 inline-flex items-center gap-1.5 rounded-lg px-1.5 text-left hover:bg-accent-soft data-[state=open]:bg-accent-soft"
      >
        <span className="min-w-0 break-words">{current.name}</span>
        <ChevronsUpDown className="size-5 shrink-0 text-muted" aria-hidden />
      </MenuTrigger>
      <MenuContent align="start" className="max-h-[min(24rem,70dvh)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto">
        <MenuLabel>Switch project</MenuLabel>
        {projects.map((p) => {
          const isCurrent = p.id === current.id;
          return (
            <MenuItem key={p.id} asChild>
              <Link href={`/p/${p.slug}`} aria-current={isCurrent ? "page" : undefined}>
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
