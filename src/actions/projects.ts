"use server";

import { revalidatePath } from "next/cache";
import { addSteps, createProject, deleteProject, restoreProject, updateProject } from "@/db/mutations";
import type { PasteEdits, ProjectFieldsInput } from "@/lib/schemas";

function refresh() {
  revalidatePath("/");
  revalidatePath("/p/[slug]", "layout");
}

/** Creates a project, and adds the steps in `text` if any were pasted. */
export async function createProjectAction(input: ProjectFieldsInput, text = "", edits: PasteEdits = {}) {
  const project = await createProject(input);
  const result = text.trim() ? await addSteps(project.id, text, edits) : null;
  refresh();
  return { slug: project.slug, added: result?.added.length ?? 0, warnings: result?.warnings ?? [] };
}

export async function updateProjectAction(projectId: string, input: ProjectFieldsInput) {
  await updateProject(projectId, input);
  refresh();
}

export async function deleteProjectAction(projectId: string) {
  await deleteProject(projectId);
  refresh();
  return projectId;
}

export async function restoreProjectAction(projectId: string) {
  await restoreProject(projectId);
  refresh();
}
