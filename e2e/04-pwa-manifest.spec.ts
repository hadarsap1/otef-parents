import { test, expect } from "@playwright/test";

test.describe("PWA & Metadata", () => {
  test("manifest.json is accessible and valid", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);

    const manifest = await res.json();
    expect(manifest.name).toBe("לו״ז הארי");
    expect(manifest.short_name).toBe("לו״ז הארי");
    expect(manifest.dir).toBe("rtl");
    expect(manifest.lang).toBe("he");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/dashboard");
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons[0].sizes).toBe("192x192");
    expect(manifest.icons[1].sizes).toBe("512x512");
  });

  test("login page has correct meta tags", async ({ page }) => {
    await page.goto("/login");

    // Viewport meta (may have multiple, use first)
    const viewport = page.locator('meta[name="viewport"]').first();
    await expect(viewport).toHaveAttribute(
      "content",
      expect.stringContaining("viewport-fit=cover")
    );

    // Manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");
  });

  test("page has apple-web-app meta", async ({ page }) => {
    await page.goto("/login");

    // Next.js renders apple-mobile-web-app-capable as apple-web-app meta
    const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]');
    const count = await appleMeta.count();
    // If Next.js doesn't render this specific meta tag, check title instead
    if (count > 0) {
      await expect(appleMeta).toHaveAttribute("content", "yes");
    } else {
      // Verify apple-web-app title is set via apple-mobile-web-app-title
      const titleMeta = page.locator('meta[name="apple-mobile-web-app-title"]');
      await expect(titleMeta).toHaveAttribute("content", "לו״ז הארי");
    }
  });
});
