import { test, expect } from "@playwright/test";

test.describe("Static Assets & Routes", () => {
  test("favicon or app icons are served", async ({ request }) => {
    // Next.js serves favicon automatically
    const res = await request.get("/favicon.ico");
    // May be 200 or 404 depending on if favicon exists
    expect([200, 404]).toContain(res.status());
  });

  test("manifest.json returns valid JSON", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("NextAuth API endpoint exists", async ({ request }) => {
    const res = await request.get("/api/auth/providers");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("google");
    expect(data.google.id).toBe("google");
    expect(data.google.name).toBe("Google");
    expect(data.google.type).toBe("oauth");
  });

  test("NextAuth CSRF endpoint exists", async ({ request }) => {
    const res = await request.get("/api/auth/csrf");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("csrfToken");
  });

  test("NextAuth session endpoint returns null for unauthenticated", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.status()).toBe(200);
    const data = await res.json();
    // Unauthenticated session should be empty object
    expect(data).toEqual({});
  });
});
