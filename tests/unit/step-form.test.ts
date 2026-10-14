import { describe, expect, it } from "vitest";
import { emptyUsageForm, formToFields, stepToForm, type StepForm } from "@/lib/step-form";

const fields = {
  title: "Scaffold",
  phase: "Implementation",
  subGroup: "Phase 0",
  notes: "a note",
  apiDurationS: 8062,
  wallDurationS: null,
  usages: [
    { model: "claude-opus-5-5", effort: "high" as const, inputTokens: 29_800, outputTokens: 78_400, cacheRead: 4_700_000, cacheWrite: 536_300, costUsd: 5.68 },
    { model: "claude-haiku-5-5", effort: null, inputTokens: 1, outputTokens: 2, cacheRead: 3, cacheWrite: 4, costUsd: null },
  ],
};

describe("stepToForm / formToFields", () => {
  it("round-trips a step's fields", () => {
    const r = formToFields(stepToForm(fields));
    expect(r).toEqual({ ok: true, value: fields });
  });

  it("accepts k/m shorthand, a $ in the cost and h/m/s durations", () => {
    const form = stepToForm(fields);
    form.usages[0].input = "1.5k";
    form.usages[0].cost = "$7.25";
    form.wall = "1h 2m 3s";
    const r = formToFields(form);
    expect(r.ok && r.value.usages[0]).toMatchObject({ inputTokens: 1500, costUsd: 7.25 });
    expect(r.ok && r.value.wallDurationS).toBe(3723);
  });

  it("turns blank optional fields into null and blank token boxes into 0", () => {
    const form: StepForm = { ...stepToForm(fields), subGroup: "", notes: "  ", api: "", wall: "" };
    form.usages = [{ ...emptyUsageForm(), model: "claude-opus-5-5" }];
    const r = formToFields(form);
    expect(r.ok && r.value).toMatchObject({ subGroup: null, notes: null, apiDurationS: null, wallDurationS: null });
    expect(r.ok && r.value.usages[0]).toMatchObject({ effort: null, inputTokens: 0, costUsd: null });
  });

  it.each([
    ["an empty title", (f: StepForm) => void (f.title = " "), /title/i],
    ["an unreadable token count", (f: StepForm) => void (f.usages[0].output = "lots"), /output/i],
    ["an unreadable cost", (f: StepForm) => void (f.usages[0].cost = "free"), /cost/i],
    ["an unreadable duration", (f: StepForm) => void (f.api = "soon"), /api/i],
    ["a bad model id", (f: StepForm) => void (f.usages[1].model = "gpt"), /model/i],
    ["no model lines", (f: StepForm) => void (f.usages = []), /model line/i],
  ])("rejects %s with a message", (_name, mutate, message) => {
    const form = stepToForm(fields);
    mutate(form);
    const r = formToFields(form);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(message);
  });
});
