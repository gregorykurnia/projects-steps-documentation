import { describe, expect, it } from "vitest";
import { baseFingerprint, previewItems } from "@/lib/preview";
import { parseNotes } from "@/lib/parse-notes";
import { stepFingerprint } from "@/lib/fingerprint";
import { stepToForm } from "@/lib/step-form";

const notes = (...lines: string[]) => parseNotes(lines.join("\n")).steps;
const A = "Alpha: claude-opus-5-5 High: 1 input, 2 output";
const B = "Beta: claude-sonnet-5-5 High: 3 input, 4 output";

describe("previewItems", () => {
  it("marks steps whose fingerprint is already known, and repeats inside one paste", () => {
    const steps = notes(A, B, B);
    const known = new Set([stepFingerprint("Alpha", steps[0].usages)]);
    expect(previewItems(steps, known, {}).map((i) => i.already)).toEqual([true, false, true]);
  });

  it("flags a step that can't be saved (over a field limit) without blocking the others", () => {
    const long = "t".repeat(301);
    const items = previewItems(notes(`${long}: claude-opus-5-5: 1 input`, B), new Set(), {});
    expect(items[0].error).toMatch(/title/i);
    expect(items[0].fields).toBeNull();
    expect(items[1].error).toBeNull();
    expect(items[1].fields).not.toBeNull();
  });

  it("applies an edit found under the step's original fingerprint, wherever the step sits in the paste", () => {
    const steps = notes(A, B);
    const edit = { ...stepToForm({ ...steps[1], notes: null }), title: "Beta renamed" };
    const edits = { [baseFingerprint(steps[1])]: edit };
    expect(previewItems(steps, new Set(), edits)[1].fields?.title).toBe("Beta renamed");
    // The same step now second-from-last after a new line is pasted above it: the edit still applies.
    const more = notes("Gamma: claude-haiku-5-5: 5 input", A, B);
    expect(previewItems(more, new Set(), edits).map((i) => i.fields?.title)).toEqual(["Gamma", "Alpha", "Beta renamed"]);
  });

  it("flags an invalid edit", () => {
    const steps = notes(A);
    const edits = { [baseFingerprint(steps[0])]: { ...stepToForm({ ...steps[0], notes: null }), title: " " } };
    const [item] = previewItems(steps, new Set(), edits);
    expect(item.error).toMatch(/title/i);
    expect(item.fields).toBeNull();
  });
});
