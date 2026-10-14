import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

for (const path of ["/", "/p/wedding-plan-redesign", "/new"]) {
  test(`${path} never scrolls sideways on a phone`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("on a phone, Paste steps is a fixed button at the bottom and works", async ({ page }) => {
  // Its own project, so the seeded ones keep their step counts for the other specs.
  await page.goto("/new");
  await page.getByLabel("Name", { exact: true }).fill("Phone Flow");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/p\/phone-flow$/);
  const button = page.getByRole("button", { name: "Paste steps" }).last();
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThan(844 - 80);
  await button.click();
  await page.getByRole("textbox", { name: "Pasted notes" }).fill("Phone Step: claude-haiku-5-5 Max: 1 input, 2 output");
  await expect(page.getByText("1 new")).toBeVisible();
  await page.getByRole("button", { name: "Add 1 step" }).click();
  await expect(page.getByText("Added 1 step", { exact: true })).toBeVisible();
  await expect(page.locator("[data-step-id]")).toHaveCount(1);
});
