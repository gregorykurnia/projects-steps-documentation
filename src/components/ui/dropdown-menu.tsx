"use client";

import { DropdownMenu } from "radix-ui";
import { clsx } from "clsx";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        className={clsx("z-50 min-w-40 rounded-card border border-border bg-surface p-1", className)}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  danger,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Item> & { danger?: boolean }) {
  return (
    <DropdownMenu.Item
      className={clsx(
        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent-soft",
        danger ? "text-danger" : "text-text",
        className,
      )}
      {...props}
    />
  );
}
