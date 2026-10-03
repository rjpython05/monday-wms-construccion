import { test, expect } from "@playwright/test";

test("la página de inicio carga", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "WMS Construcción" }),
  ).toBeVisible();
});
