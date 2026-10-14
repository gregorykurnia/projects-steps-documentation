"use server";

import { revalidatePath } from "next/cache";
import { createProjectWithSteps, deleteProject, restoreProject, updateProject } from "@/db/mutations";
import type { PasteEdits, ProjectFieldsInput } from "@/lib/schemas";

function refresh() {
  revalidatePath("/");
  revalidatePath("/p/[slug]", "layout");
}

/** Creates a project, and adds the steps in `text` if any were pasted. */
export async function createProjectAction(input: ProjectFieldsInput, text = "", edits: PasteEdits = {}) {
  const result = await createProjectWithSteps(input, text, edits);
  refresh();
  return { slug: result.project.slug, added: result.added.length, warnings: result.warnings };
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
