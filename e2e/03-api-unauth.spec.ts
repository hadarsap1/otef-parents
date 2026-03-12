import { test, expect } from "@playwright/test";

test.describe("API Routes — Unauthenticated returns 401", () => {
  const endpoints = [
    { method: "GET", path: "/api/children" },
    { method: "POST", path: "/api/children" },
    { method: "GET", path: "/api/playdates" },
    { method: "POST", path: "/api/playdates" },
    { method: "GET", path: "/api/groups" },
    { method: "POST", path: "/api/groups" },
    { method: "GET", path: "/api/dashboard/feed" },
    { method: "GET", path: "/api/schedule" },
  ];

  for (const { method, path } of endpoints) {
    test(`${method} ${path} returns 401`, async ({ request }) => {
      const res =
        method === "GET"
          ? await request.get(path)
          : await request.post(path, {
              data: {},
              headers: { "Content-Type": "application/json" },
            });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  }
});

test.describe("API Routes — Teacher-only endpoints return 401/403 without auth", () => {
  test("GET /api/groups returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/groups");
    expect(res.status()).toBe(401);
  });

  test("POST /api/groups returns 401 without session", async ({ request }) => {
    const res = await request.post("/api/groups", {
      data: { name: "Test Group" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
  });
});
