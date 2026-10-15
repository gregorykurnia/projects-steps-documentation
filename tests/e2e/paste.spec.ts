import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const DEUS = readFileSync("docs/seed-data/deus-hcs-website.txt", "utf8");

async function openPaste(page: Page) {
  await page.getByRole("button", { name: "Paste steps" }).first().click();
  return page.getByRole("textbox", { name: "Pasted notes" });
}

test("paste the DEUS notes into an empty project, then re-paste: nothing is added twice", async ({ page }) => {
  await page.goto("/new");
  await page.getByLabel("Name", { exact: true }).fill("Paste Flow");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/p\/paste-flow$/);
  await expect(page.getByText("No steps yet")).toBeVisible();

  // First paste: 7 new steps.
  let box = await openPaste(page);
  await box.fill(DEUS);
  await expect(page.getByText(/7 steps understood/)).toBeVisible();
  await expect(page.getByText("7 new")).toBeVisible();
  await page.getByRole("button", { name: "Add 7 steps" }).click();
  await expect(page.getByText("Added 7 steps")).toBeVisible();
  await expect(page.locator("[data-step-id]")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "Phase 0" })).toBeVisible();

  // Same text again: every step is already there.
  box = await openPaste(page);
  await box.fill(DEUS);
  await expect(page.getByText(/7 already added/)).toBeVisible();
  await expect(page.getByText("0 new")).toBeVisible();
  await expect(page.getByText("already added", { exact: true })).toHaveCount(7);
  await expect(page.getByRole("button", { name: "Nothing new to add" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-step-id]")).toHaveCount(7);
});

test("one pasted line is a step, and Ctrl+Enter adds it", async ({ page }) => {
  await page.goto("/p/paste-flow");
  const box = await openPaste(page);
  await box.fill("Extra Step: claude-opus-5-5 High: 12 input, 3.4k output, 1.2m cache read, 56.7k cache write ($0.99)");
  await expect(page.getByText("1 new")).toBeVisible();
  await box.press("Control+Enter");
  await expect(page.getByText("Added 1 step", { exact: true })).toBeVisible();
  await expect(page.locator("[data-step-id]")).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Extra Step" })).toBeVisible();
});

test("a line it can't read shows up as a warning and nothing is dropped silently", async ({ page }) => {
  await page.goto("/p/paste-flow");
  const box = await openPaste(page);
  await box.fill("A title with no numbers\nGood One: claude-haiku-5-5: 1 input, 2 output");
  await expect(page.getByText(/no usage found for “A title with no numbers”/)).toBeVisible();
  await expect(page.getByText("1 new")).toBeVisible();
});

test("an edit in the preview is saved", async ({ page }) => {
  await page.goto("/p/paste-flow");
  const box = await openPaste(page);
  await box.fill("Before Edit: claude-sonnet-5-5 High: 5 input, 6 output");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Title").fill("After Edit");
  await page.getByRole("button", { name: "Add 1 step" }).click();
  await expect(page.getByText("Added 1 step", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "After Edit" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Before Edit" })).toHaveCount(0);
});

test("delete a step, undo it, then delete it again and restore it from Recently deleted", async ({ page }) => {
  await page.goto("/p/paste-flow");
  const count = () => page.locator("[data-step-id]");
  const before = await count().count();

  await page.getByRole("button", { name: "Actions for After Edit" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(count()).toHaveCount(before - 1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(count()).toHaveCount(before);

  await page.getByRole("button", { name: "Actions for After Edit" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(count()).toHaveCount(before - 1);
  await page.getByText(/Recently deleted \(1\)/).click();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(count()).toHaveCount(before);
});

test("move a step up, edit it, and change project settings", async ({ page }) => {
  await page.goto("/p/paste-flow");
  const titles = () => page.locator("[data-step-id] h3").allTextContents();
  const first = (await titles())[0];
  await page.getByRole("button", { name: "Actions for Make Designs, 3 Alternatives" }).click();
  await page.getByRole("menuitem", { name: "Move up" }).click();
  await expect.poll(async () => (await titles())[0]).toBe("Make Designs, 3 Alternatives");
  expect((await titles())[1]).toBe(first);

  await page.getByRole("button", { name: "Actions for Scaffold" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/steps\//);
  await page.getByLabel("Notes (optional)").fill("checked by hand");
  await page.getByRole("button", { name: "Save step" }).click();
  await expect(page.getByText("checked by hand")).toBeVisible();

  await page.getByRole("link", { name: "Project settings" }).click();
  await page.getByLabel("Status").selectOption("done");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
});

test("pasting notes on /new fills the project name from the first line", async ({ page }) => {
  await page.goto("/new");
  await page.getByLabel("Paste your notes (optional)").fill(
    "Name From Notes:\nFirst Step\nclaude-opus-5-5 Medium: 1 input, 2 output, 3 cache read, 4 cache write ($1.00)",
  );
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Name From Notes");
  await page.getByRole("button", { name: /Create project and add 1 step/ }).click();
  await expect(page).toHaveURL(/\/p\/name-from-notes$/);
  await expect(page.locator("[data-step-id]")).toHaveCount(1);
});

test("delete a project, undo, and see it on the home page", async ({ page }) => {
  await page.goto("/p/name-from-notes/settings");
  await page.getByRole("button", { name: "Delete project" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: /Name From Notes/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: /Name From Notes/ })).toBeVisible();
});

test("preview edits survive more typing, and an edited step is not added twice on a re-paste", async ({ page }) => {
  await page.goto("/new");
  await page.getByLabel("Name", { exact: true }).fill("Edit Keep");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/p\/edit-keep$/);

  const first = "Typo Titel: claude-sonnet-5-5 High: 5 input, 6 output";
  const box = await openPaste(page);
  await box.fill(first);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Title").fill("Typo Title");
  // More notes pasted below: the edit made above must stay.
  await box.fill(`${first}\nSecond: claude-haiku-5-5: 1 input, 2 output`);
  await expect(page.getByText("2 steps understood")).toBeVisible();
  await expect(page.getByText("Typo Title", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add 2 steps" }).click();
  await expect(page.getByText("Added 2 steps", { exact: true })).toBeVisible();
  await expect(page.locator("[data-step-id]")).toHaveCount(2);

  // Re-paste the original, unedited notes: the corrected step is recognised, not added again.
  const again = await openPaste(page);
  await again.fill(`${first}\nSecond: claude-haiku-5-5: 1 input, 2 output`);
  await expect(page.getByText(/2 already added/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Nothing new to add" })).toBeDisabled();
});

test("one step that can't be saved doesn't stop the rest of the paste", async ({ page }) => {
  await page.goto("/p/edit-keep");
  const box = await openPaste(page);
  await box.fill(`${"x".repeat(301)}: claude-opus-5-5: 1 input\nFine Step: claude-opus-5-5: 2 input`);
  await expect(page.getByRole("alert").filter({ hasText: /title/i })).toBeVisible();
  await page.getByRole("button", { name: "Add 1 step" }).click();
  await expect(page.getByText("Added 1 step", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fine Step" })).toBeVisible();
});

test("move a step to another project, undo it, move it again and bring it back", async ({ page }) => {
  const count = () => page.locator("[data-step-id]");
  const tokens = page.getByRole("heading", { name: "Tokens", level: 3 });
  const moveTokensTo = async (project: RegExp) => {
    await page.getByRole("button", { name: "Actions for Tokens" }).click();
    await page.getByRole("menuitem", { name: "Move to project…" }).click();
    await page.getByRole("button", { name: project }).click();
  };

  await page.goto("/p/deus-hcs-website");
  await expect(count()).toHaveCount(7);
  await moveTokensTo(/Wedding Plan Redesign/);
  await expect(page.getByText("Step moved to Wedding Plan Redesign")).toBeVisible();
  await expect(count()).toHaveCount(6);
  await expect(tokens).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(count()).toHaveCount(7);

  await moveTokensTo(/Wedding Plan Redesign/);
  await expect(count()).toHaveCount(6);
  await page.goto("/p/wedding-plan-redesign");
  await expect(count()).toHaveCount(15);
  await expect(tokens).toBeVisible();

  // Put the seeded data back for the specs that count steps.
  await moveTokensTo(/DEUS HCS Website/);
  await expect(count()).toHaveCount(14);
});
