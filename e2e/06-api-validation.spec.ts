import { test, expect } from "@playwright/test";

test.describe("API Input Validation (without auth — expect 401 before validation)", () => {
  // These tests verify the API routes exist and respond correctly.
  // Since we can't authenticate in E2E without Google OAuth,
  // we verify that all routes are protected and respond with proper JSON.

  test("POST /api/children with empty body returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/children", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/playdates with empty body returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/playdates", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("PUT /api/children/nonexistent returns 401 JSON", async ({ request }) => {
    const res = await request.put("/api/children/nonexistent", {
      data: { name: "test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("DELETE /api/children/nonexistent returns 401 JSON", async ({ request }) => {
    const res = await request.delete("/api/children/nonexistent");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/children/nonexistent/invite returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/children/nonexistent/invite");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/children/invite/redeem returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/children/invite/redeem", {
      data: { code: "ABC123" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/playdates/nonexistent/join returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/playdates/nonexistent/join", {
      data: { childId: "test" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/groups/nonexistent returns 401 JSON", async ({ request }) => {
    const res = await request.get("/api/groups/nonexistent");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/groups/nonexistent/invite returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/groups/nonexistent/invite");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/groups/invite/redeem returns 401 JSON", async ({ request }) => {
    const res = await request.post("/api/groups/invite/redeem", {
      data: { code: "ABC123" },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
