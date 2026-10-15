"use server";

import { revalidatePath } from "next/cache";
import {
  addSteps,
  deleteStep,
  moveStep,
  moveStepToProject,
  repasteStepUsages,
  restoreStep,
  updateStep,
} from "@/db/mutations";
import type { PasteEdits, StepFieldsInput } from "@/lib/schemas";

function refresh() {
  revalidatePath("/");
  revalidatePath("/p/[slug]", "layout");
}

export async function addStepsAction(projectId: string, text: string, edits: PasteEdits = {}) {
  const result = await addSteps(projectId, text, edits);
  refresh();
  return result;
}

export async function updateStepAction(stepId: string, fields: StepFieldsInput) {
  await updateStep(stepId, fields);
  refresh();
}

export async function repasteStepAction(stepId: string, text: string) {
  const result = await repasteStepUsages(stepId, text);
  refresh();
  return result;
}

export async function deleteStepAction(stepId: string) {
  await deleteStep(stepId);
  refresh();
  return stepId;
}

export async function restoreStepAction(stepId: string) {
  await restoreStep(stepId);
  refresh();
}

export async function moveStepAction(stepId: string, direction: "up" | "down") {
  await moveStep(stepId, direction);
  refresh();
}

export async function moveStepToProjectAction(stepId: string, targetProjectId: string, position?: number) {
  const result = await moveStepToProject(stepId, targetProjectId, position);
  refresh();
  return result;
}
