"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProjectAction, restoreProjectAction, updateProjectAction } from "@/actions/projects";
import type { Project } from "@/db/schema";
import { showUndo } from "@/lib/undo-toast";
import { Button, LinkButton } from "./ui/button";
import { Field, Input, Select, Textarea } from "./ui/input";

export function ProjectSettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<"in_progress" | "done">(project.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) return setError("Name can't be empty");
    setError(null);
    startTransition(async () => {
      try {
        await updateProjectAction(project.id, { name, description, status });
        toast.success("Project saved");
        router.push(`/p/${project.slug}`);
      } catch {
        setError("Couldn't save. Check the fields and try again.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteProjectAction(project.id);
      showUndo(`“${project.name}” deleted`, () => restoreProjectAction(project.id));
      router.push("/");
    });
  }

  return (
    <div className="max-w-xl space-y-5">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </Field>
      <Field label="Description (optional)">
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </Field>
      <Field label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value as "in_progress" | "done")}>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </Select>
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" onClick={save} disabled={pending}>
          Save
        </Button>
        <LinkButton href={`/p/${project.slug}`} variant="secondary">
          Cancel
        </LinkButton>
      </div>

      <section className="border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-text">Delete project</h2>
        <p className="mt-1 text-sm text-muted">
          Removes the project and all its steps. You get 10 seconds to undo, and it stays in “Recently deleted” on the home page
          for 30 days.
        </p>
        <Button variant="danger" className="mt-3" onClick={remove} disabled={pending}>
          Delete project
        </Button>
      </section>
    </div>
  );
}
