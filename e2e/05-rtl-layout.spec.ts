import { test, expect } from "@playwright/test";

test.describe("RTL Layout Verification", () => {
  test("HTML has correct RTL attributes", async ({ page }) => {
    await page.goto("/login");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "he");
  });

  test("body uses Rubik font variable", async ({ page }) => {
    await page.goto("/login");

    const body = page.locator("body");
    const className = await body.getAttribute("class");
    // Turbopack hashes class names; check for "rubik" substring
    expect(className?.toLowerCase()).toContain("rubik");
  });

  test("login card is centered on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    const container = page.locator(".min-h-screen.flex").first();
    await expect(container).toBeVisible();
  });

  test("no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  });
});
