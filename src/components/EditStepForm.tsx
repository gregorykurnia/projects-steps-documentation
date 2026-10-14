"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { repasteStepAction, updateStepAction } from "@/actions/steps";
import { formToFields, stepToForm, type StepForm } from "@/lib/step-form";
import type { StepWithUsages } from "@/db/queries";
import { StepFieldsForm } from "./StepFieldsForm";
import { Button, LinkButton } from "./ui/button";
import { Field, Textarea } from "./ui/input";

export function EditStepForm({ step, slug }: { step: StepWithUsages; slug: string }) {
  const router = useRouter();
  const [form, setForm] = useState<StepForm>(() => stepToForm(step));
  const [repaste, setRepaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const back = `/p/${slug}#step-${step.id}`;

  function save() {
    const r = formToFields(form);
    if (!r.ok) return setError(r.error);
    setError(null);
    startTransition(async () => {
      try {
        await updateStepAction(step.id, r.value);
        toast.success("Step saved");
        router.push(back);
      } catch {
        setError("Couldn't save. Check the fields and try again.");
      }
    });
  }

  function applyRepaste() {
    startTransition(async () => {
      const r = await repasteStepAction(step.id, repaste);
      if (!r.ok) return setError(r.message ?? "Couldn't read that text");
      toast.success("Numbers replaced from the new paste");
      router.refresh();
      router.push(back);
    });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <StepFieldsForm value={form} onChange={setForm} />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save step"}
        </Button>
        <LinkButton href={back} variant="secondary">
          Cancel
        </LinkButton>
      </div>

      <section className="border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-text">Re-paste the numbers</h2>
        <p className="mt-1 text-sm text-muted">
          Replace this step&apos;s model lines and durations with the first step found in a new paste. Title, phase and notes stay.
        </p>
        <Field label="Notes to read" className="mt-3">
          <Textarea rows={4} value={repaste} onChange={(e) => setRepaste(e.target.value)} className="num text-[13px]" />
        </Field>
        <Button className="mt-3" onClick={applyRepaste} disabled={pending || !repaste.trim()}>
          Replace numbers
        </Button>
      </section>
    </div>
  );
}
