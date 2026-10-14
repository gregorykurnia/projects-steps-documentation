"use client";

import { Switch as SwitchPrimitive } from "radix-ui";

export function Switch({ label, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root> & { label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-muted">
      <SwitchPrimitive.Root
        className="relative h-5 w-9 rounded-full border border-border bg-bg transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent"
        {...props}
      >
        <SwitchPrimitive.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-on-accent" />
      </SwitchPrimitive.Root>
      {label}
    </label>
  );
}
