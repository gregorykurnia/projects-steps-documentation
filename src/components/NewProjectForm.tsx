"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProjectAction } from "@/actions/projects";
import { MAX_PASTE_CHARS, type PasteEdits } from "@/lib/schemas";
import { formToFields, type StepForm } from "@/lib/step-form";
import { PastePreview } from "./paste/PastePreview";
import { usePaste } from "./paste/usePaste";
import { Button, LinkButton } from "./ui/button";
import { Field, Input, Textarea } from "./ui/input";

const NO_FINGERPRINTS: string[] = [];

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [edits, setEdits] = useState<Record<string, StepForm>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { parsed, items, toAdd, alreadyCount } = usePaste(text, NO_FINGERPRINTS, edits);
  const suggested = parsed.projectName ?? "";
  const shownName = nameTouched ? name : suggested || name;

  function create() {
    if (pending || text.length > MAX_PASTE_CHARS) return;
    if (!shownName.trim()) return setError("Give the project a name");
    setError(null);
    const payload: PasteEdits = {};
    for (const item of items) {
      const form = edits[item.baseFp];
      const r = form ? formToFields(form) : null;
      if (r?.ok) payload[String(item.index)] = r.value;
    }
    startTransition(async () => {
      try {
        const r = await createProjectAction({ name: shownName, description }, text, payload);
        toast.success(r.added ? `Project created with ${r.added} ${r.added === 1 ? "step" : "steps"}` : "Project created");
        router.push(`/p/${r.slug}`);
      } catch {
        setError("Couldn't create the project. Check the name and the pasted text and try again.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Field label="Name">
        <Input
          value={shownName}
          onChange={(e) => {
            setName(e.target.value);
            setNameTouched(true);
          }}
          maxLength={120}
          autoFocus
        />
      </Field>
      <Field label="Description (optional)">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </Field>
      <Field label="Paste your notes (optional)">
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") create();
          }}
          placeholder={"Wedding Plan Redesign:\nCapability Inventory Mapping\nclaude-opus-5-5 Medium: 29.8k input, 78.4k output, 4.7m cache read, 536.3k cache write ($5.68)"}
          className="num min-h-40 text-[13px] leading-relaxed"
        />
        {text.length > MAX_PASTE_CHARS ? (
          <span role="alert" className="mt-1 block text-sm text-danger">
            That&apos;s too long to add at once. Paste it in parts.
          </span>
        ) : null}
      </Field>
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
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" onClick={create} disabled={pending || text.length > MAX_PASTE_CHARS}>
          {pending ? "Creating…" : toAdd.length ? `Create project and add ${toAdd.length} ${toAdd.length === 1 ? "step" : "steps"}` : "Create project"}
        </Button>
        <LinkButton href="/" variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </div>
  );
}
