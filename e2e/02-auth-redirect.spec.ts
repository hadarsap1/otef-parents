import { test, expect } from "@playwright/test";

test.describe("Auth Redirects (unauthenticated)", () => {
  test("/ redirects to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("/dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("/dashboard/children redirects to /login", async ({ page }) => {
    await page.goto("/dashboard/children");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("/dashboard/playdates redirects to /login", async ({ page }) => {
    await page.goto("/dashboard/playdates");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("/dashboard/teacher redirects to /login", async ({ page }) => {
    await page.goto("/dashboard/teacher");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });
});
