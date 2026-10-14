import { readFileSync } from "node:fs";
import { test } from "@playwright/test";

// Saves screenshots to screenshots/ (gitignored) for checking by eye: 390 and 1280 wide, light and dark.
const DEUS = readFileSync("docs/seed-data/deus-hcs-website.txt", "utf8");
const sizes = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };

for (const [device, viewport] of Object.entries(sizes)) {
  for (const theme of ["light", "dark"] as const) {
    test(`screenshots: ${device} ${theme}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport });
      await context.addCookies([{ name: "theme", value: theme, url: "http://localhost:3187" }]);
      const page = await context.newPage();
      const shot = (name: string) => page.screenshot({ path: `screenshots/${name}-${device}-${theme}.png`, fullPage: true });

      await page.goto("/");
      await shot("home");
      await page.goto("/p/wedding-plan-redesign");
      await shot("project");
      await page.goto("/new");
      await shot("new");

      await page.goto("/p/deus-hcs-website");
      await page.getByRole("button", { name: "Paste steps" }).last().click();
      await page.getByRole("textbox", { name: "Pasted notes" }).fill(`${DEUS}\nUnreadable title`);
      await page.getByText(/steps understood/).waitFor();
      await page.screenshot({ path: `screenshots/paste-${device}-${theme}.png` });
      await context.close();
    });
  }
}
