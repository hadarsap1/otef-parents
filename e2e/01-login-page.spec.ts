import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("renders login page with Hebrew text and Google button", async ({ page }) => {
    await page.goto("/login");

    // Check page title (Hebrew app name)
    await expect(page.getByText("לו״ז הארי", { exact: true })).toBeVisible();

    // Check Hebrew subtitle
    await expect(page.getByText("לוח זמנים למשפחה")).toBeVisible();

    // Check Google login button exists
    await expect(page.getByText("התחברות עם Google")).toBeVisible();
  });

  test("page has RTL direction", async ({ page }) => {
    await page.goto("/login");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "he");
  });

  test("page is responsive (mobile viewport)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    // Google button should be visible and not overflow
    const button = page.getByText("התחברות עם Google");
    await expect(button).toBeVisible();

    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });
});
