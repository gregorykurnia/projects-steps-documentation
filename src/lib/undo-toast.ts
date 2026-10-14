"use client";

import { toast } from "sonner";

/** A toast with an Undo button that stays for 10 seconds. */
export function showUndo(message: string, onUndo: () => Promise<unknown>) {
  toast(message, {
    duration: 10_000,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          await onUndo();
          toast.success("Restored");
        } catch {
          toast.error("Couldn't undo that");
        }
      },
    },
  });
}
