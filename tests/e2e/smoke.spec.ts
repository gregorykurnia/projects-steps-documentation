import { expect, test } from "@playwright/test";

test("home lists both seeded projects and the all-projects model stats", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "All projects", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Wedding Plan Redesign/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /DEUS HCS Website/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All projects, by model" })).toBeVisible();
  await expect(page).toHaveTitle(/AI Build Log/);
});

test("project page reads the database: 14 steps, per-model stats, cost bars", async ({ page }) => {
  await page.goto("/p/wedding-plan-redesign");
  await expect(page.getByRole("heading", { name: "Wedding Plan Redesign", level: 1 })).toBeVisible();
  await expect(page.locator("[data-step-id]")).toHaveCount(14);
  await expect(page.getByRole("heading", { name: "Stats per model" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cost by step" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Implementation", level: 2 })).toBeVisible();
  await expect(page).toHaveTitle("Wedding Plan Redesign · AI Build Log");
});

test("the DEUS project shows its Phase 0 sub-group", async ({ page }) => {
  await page.goto("/p/deus-hcs-website");
  await expect(page.locator("[data-step-id]")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "Phase 0" })).toBeVisible();
});

test("an unknown project shows the styled 404", async ({ page }) => {
  const res = await page.goto("/p/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("search engines are told to stay away", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
});

test("model stats can be grouped by model only", async ({ page }) => {
  await page.goto("/p/wedding-plan-redesign");
  const rows = page.locator("table tbody tr");
  const before = await rows.count();
  await page.getByRole("switch").click();
  await expect.poll(async () => rows.count()).toBeLessThan(before);
});

test("the project name switches to another project", async ({ page }) => {
  await page.goto("/p/wedding-plan-redesign");
  await page.getByRole("button", { name: "Wedding Plan Redesign" }).click();
  await expect(page.getByRole("menuitem", { name: "Wedding Plan Redesign" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("menuitem", { name: "DEUS HCS Website" }).click();
  await expect(page).toHaveURL(/\/p\/deus-hcs-website$/);
  await expect(page.getByRole("heading", { name: "DEUS HCS Website", level: 1 })).toBeVisible();
  await expect(page.locator("[data-step-id]")).toHaveCount(7);
});

test("the switcher on settings opens the other project's settings", async ({ page }) => {
  await page.goto("/p/wedding-plan-redesign/settings");
  await page.getByRole("button", { name: "Wedding Plan Redesign" }).click();
  await page.getByRole("menuitem", { name: "DEUS HCS Website" }).click();
  await expect(page).toHaveURL(/\/p\/deus-hcs-website\/settings$/);
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("DEUS HCS Website");
});

test("the switcher on edit step opens the other project's page", async ({ page }) => {
  await page.goto("/p/wedding-plan-redesign");
  await page.getByRole("button", { name: "Actions for Capability Inventory Mapping" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit step", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Wedding Plan Redesign" }).click();
  await page.getByRole("menuitem", { name: "DEUS HCS Website" }).click();
  await expect(page).toHaveURL(/\/p\/deus-hcs-website$/);
  await expect(page.locator("[data-step-id]")).toHaveCount(7);
});
