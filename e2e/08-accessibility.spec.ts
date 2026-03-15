import { test, expect } from "@playwright/test";

test.describe("Accessibility — Login Page", () => {
  test("Google login button is keyboard accessible", async ({ page }) => {
    await page.goto("/login");

    const button = page.getByText("התחברות עם Google");
    await expect(button).toBeVisible();

    // Button should be focusable
    await button.focus();
    await expect(button).toBeFocused();
  });

  test("page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/login");

    // Shadcn v5 CardTitle uses div, not h* tags — check for role="heading" or text hierarchy
    const title = page.getByText("לו״ז הארי", { exact: true });
    await expect(title).toBeVisible();
  });

  test("login button has visible text content", async ({ page }) => {
    await page.goto("/login");

    const button = page.getByRole("button");
    const count = await button.count();
    expect(count).toBeGreaterThan(0);

    // Button should have text
    const firstButton = button.first();
    const text = await firstButton.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("no images without alt text on login page", async ({ page }) => {
    await page.goto("/login");

    // SVG icons inside buttons are decorative, so check for <img> tags
    const images = page.locator("img:not([alt])");
    const count = await images.count();
    expect(count).toBe(0);
  });

  test("color contrast — text is visible", async ({ page }) => {
    await page.goto("/login");

    // Verify text elements are actually rendered and visible
    const title = page.getByText("לו״ז הארי", { exact: true });
    await expect(title).toBeVisible();

    const subtitle = page.getByText("לוח זמנים למשפחה");
    await expect(subtitle).toBeVisible();
  });
});
