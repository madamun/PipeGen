/**
 * ═══════════════════════════════════════════════════════
 * API Test: Public Endpoints (ไม่ต้อง auth)
 * ═══════════════════════════════════════════════════════
 * API เหล่านี้ test การทำงานจริงได้ 100%
 * เพราะไม่ต้อง login ก่อนใช้งาน
 */
import { test, expect } from "@playwright/test";

const B = process.env.BASE_URL || "http://localhost:3000";

// ═══════════════════════════════════════════════════════
// 1. GET /api/components — ดึง categories + components
// ═══════════════════════════════════════════════════════

test.describe("GET /api/components", () => {
  test("should return 200", async ({ request }) => {
    expect((await request.get(`${B}/api/components`)).status()).toBe(200);
  });

  test("should return array of 5+ categories", async ({ request }) => {
    const data = await (await request.get(`${B}/api/components`)).json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(5);
  });

  test("each category has id, name, components array", async ({ request }) => {
    const data = await (await request.get(`${B}/api/components`)).json();
    for (const cat of data) {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("name");
      expect(Array.isArray(cat.components)).toBe(true);
    }
  });

  test("components have id, name, type, syntaxes", async ({ request }) => {
    const data = await (await request.get(`${B}/api/components`)).json();
    const comps = data.flatMap((c: any) => c.components);
    expect(comps.length).toBeGreaterThan(0);
    for (const c of comps) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("type");
      expect(Array.isArray(c.syntaxes)).toBe(true);
    }
  });

  test("syntaxes have platform and template", async ({ request }) => {
    const data = await (await request.get(`${B}/api/components`)).json();
    const syns = data.flatMap((c: any) => c.components.flatMap((p: any) => p.syntaxes));
    const withTemplate = syns.filter((s: any) => s.template?.length > 0);
    expect(withTemplate.length).toBeGreaterThan(0);
    for (const s of withTemplate) {
      expect(s).toHaveProperty("platform");
      expect(typeof s.template).toBe("string");
    }
  });

  test("categories ordered by displayOrder", async ({ request }) => {
    const data = await (await request.get(`${B}/api/components`)).json();
    const orders = data.map((c: any) => c.displayOrder).filter((o: any) => o != null);
    if (orders.length > 1) {
      expect(orders).toEqual([...orders].sort((a: number, b: number) => a - b));
    }
  });
});

// ═══════════════════════════════════════════════════════
// 2. POST /api/ai/chat — AI chat (ไม่ต้อง auth)
// ═══════════════════════════════════════════════════════

test.describe("POST /api/ai/chat", () => {
test("valid message → AI should respond with 200", async ({ request }) => {
    const res = await request.post(`${B}/api/ai/chat`, {
      data: {
        messages: [{ role: "user", content: "How to add a test step in GitHub Actions?" }],
        context: { provider: "github", fileContent: "name: CI\non:\n  push:", selectedFile: "main.yml" },
      },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("content");
    expect(data.content.length).toBeGreaterThan(0);
  });

  test("empty messages → 400 or 501", async ({ request }) => {
    expect([400, 501]).toContain((await request.post(`${B}/api/ai/chat`, { data: { messages: [] } })).status());
  });

  test("no messages field → 400 or 501", async ({ request }) => {
    expect([400, 501]).toContain((await request.post(`${B}/api/ai/chat`, { data: {} })).status());
  });
});

// ═══════════════════════════════════════════════════════
// 3. POST /api/ai/generate — AI generate (ไม่ต้อง auth)
// ═══════════════════════════════════════════════════════

test.describe("POST /api/ai/generate", () => {
  test("valid prompt → AI should respond with 200", async ({ request }) => {
    const res = await request.post(`${B}/api/ai/generate`, {
      data: { prompt: "Generate Node.js CI pipeline", provider: "github", componentValues: { use_node: true } },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("config");
    expect(data.fallback).toBe(false);
  });

  test("empty prompt → 400 or 501", async ({ request }) => {
    expect([400, 501]).toContain((await request.post(`${B}/api/ai/generate`, { data: { prompt: "" } })).status());
  });

  test("no prompt field → 400 or 501", async ({ request }) => {
    expect([400, 501]).toContain((await request.post(`${B}/api/ai/generate`, { data: {} })).status());
  });
});

// ═══════════════════════════════════════════════════════
// 4. Security headers
// ═══════════════════════════════════════════════════════

test.describe("Security headers", () => {
  test("no x-powered-by header exposed", async ({ request }) => {
    expect((await request.get(`${B}/api/components`)).headers()["x-powered-by"]).toBeUndefined();
  });
});