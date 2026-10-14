"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { addStepsAction } from "@/actions/steps";
import { MAX_PASTE_CHARS, type PasteEdits } from "@/lib/schemas";
import { formToFields, type StepForm } from "@/lib/step-form";
import { Button } from "../ui/button";
import { Textarea } from "../ui/input";
import { Sheet } from "../ui/sheet";
import { PastePreview } from "./PastePreview";
import { usePaste } from "./usePaste";

const PLACEHOLDER = `Paste your notes as you write them, one step per title, for example:

Scaffold: claude-sonnet-5-5 High: 50 input, 15.2k output, 1.7m cache read, 69.7k cache write ($0.60). Total duration (API): 2m 15s.

Re-paste the whole running document any time: steps already added are skipped.`;

/** Highlights freshly added steps once the refreshed page has rendered them. */
function flashSteps(ids: string[]) {
  let tries = 0;
  const run = () => {
    const els = ids.map((id) => document.getElementById(`step-${id}`)).filter((e): e is HTMLElement => !!e);
    if (els.length < ids.length && tries++ < 30) return void setTimeout(run, 100);
    els.forEach((el) => el.classList.add("flash"));
    els[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  run();
}

export function PasteSteps({ projectId, fingerprints }: { projectId: string; fingerprints: string[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [edits, setEdits] = useState<Record<string, StepForm>>({});
  const [pending, startTransition] = useTransition();
  const addRef = useRef<() => void>(() => {});

  const { parsed, items, toAdd, alreadyCount } = usePaste(text, fingerprints, edits);
  const canAdd = toAdd.length > 0 && !pending && text.length <= MAX_PASTE_CHARS;

  function add() {
    if (!canAdd) return;
    // The server re-parses the text and wants edits by step index; ours are kept by original fingerprint.
    const payload: PasteEdits = {};
    for (const item of items) {
      const form = edits[item.baseFp];
      const r = form ? formToFields(form) : null;
      if (r?.ok) payload[String(item.index)] = r.value;
    }
    const count = toAdd.length;
    startTransition(async () => {
      try {
        const r = await addStepsAction(projectId, text, payload);
        setOpen(false);
        setText("");
        setEdits({});
        toast.success(`Added ${r.added.length} ${r.added.length === 1 ? "step" : "steps"}`);
        if (r.added.length < count) toast.info("Some steps were already in the project and were skipped");
        flashSteps(r.added);
      } catch {
        toast.error("Couldn't add the steps. Check the preview for problems and try again.");
      }
    });
  }
  useEffect(() => {
    addRef.current = add;
  });

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} className="hidden sm:inline-flex">
        <ClipboardPaste className="size-4" aria-hidden /> Paste steps
      </Button>
      <div className="fixed inset-x-4 bottom-4 z-30 sm:hidden">
        <Button variant="primary" onClick={() => setOpen(true)} className="h-11 w-full">
          <ClipboardPaste className="size-4" aria-hidden /> Paste steps
        </Button>
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Paste steps"
        description="Paste notes, check what was understood, then add. Steps already in the project are skipped."
      >
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <Textarea
            autoFocus
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                addRef.current();
              }
            }}
            placeholder={PLACEHOLDER}
            className="num min-h-40 text-[13px] leading-relaxed"
            aria-label="Pasted notes"
          />
          {text.length > MAX_PASTE_CHARS ? (
            <p role="alert" className="text-sm text-danger">
              That&apos;s too long to add at once (limit {MAX_PASTE_CHARS.toLocaleString("en-US")} characters). Paste it in parts.
            </p>
          ) : null}
          {text.trim() && items.length === 0 && parsed.warnings.length === 0 ? (
            <p className="text-sm text-muted">Nothing that looks like a step yet. Each step needs a title and a model line.</p>
          ) : null}
          <PastePreview
            items={items}
            warnings={parsed.warnings}
            edits={edits}
            alreadyCount={alreadyCount}
            newCount={toAdd.length}
            onEdit={(key, form) =>
              setEdits((prev) => {
                const next = { ...prev };
                if (form) next[key] = form;
                else delete next[key];
                return next;
              })
            }
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="hidden text-xs text-muted sm:inline">⌘/Ctrl + Enter to add</span>
          <Button variant="primary" onClick={add} disabled={!canAdd} className="ml-auto">
            {pending ? "Adding…" : toAdd.length ? `Add ${toAdd.length} ${toAdd.length === 1 ? "step" : "steps"}` : "Nothing new to add"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
