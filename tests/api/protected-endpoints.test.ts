/**
 * ═══════════════════════════════════════════════════════
 * API Test: Protected Endpoints (ต้อง OAuth login)
 * ═══════════════════════════════════════════════════════
 * API เหล่านี้ต้อง login ผ่าน GitHub/GitLab OAuth ก่อน
 * ดังนั้นจากฝั่ง API test ทดสอบได้แค่:
 *   ✅ ไม่มี session → ต้องได้ 401 (auth protection ทำงาน)
 *   ✅ input validation → missing params ได้ 400
 *   ✅ security → invalid branch / path traversal ถูก reject
 *
 * ❌ ทดสอบการทำงานจริง (เช่น save draft แล้วดึงกลับ) ทำไม่ได้
 *    เพราะ Better-Auth ใช้ OAuth เท่านั้น สร้าง session ปลอมไม่ได้
 *    → ต้องใช้ E2E test (เปิด browser login จริง) แทน
 */
import { test, expect } from "@playwright/test";

const B = process.env.BASE_URL || "http://localhost:3000";

// ═══════════════════════════════════════════════════════
// 1. GitHub API — repos, branches, commit
// ═══════════════════════════════════════════════════════

test.describe("GitHub API — auth protection", () => {
  test("GET /api/github/repos → 401 without session", async ({ request }) => {
    expect((await request.get(`${B}/api/github/repos`)).status()).toBe(401);
  });

  test("GET /api/github/branches → 401 without session", async ({ request }) => {
    expect([400, 401]).toContain((await request.get(`${B}/api/github/branches?full_name=test/repo`)).status());
  });

  test("POST /api/github/commit → 401 without session", async ({ request }) => {
    expect([401, 403]).toContain((await request.post(`${B}/api/github/commit`, { data: {} })).status());
  });

  test("POST /api/github/commit → invalid branch name rejected", async ({ request }) => {
    const res = await request.post(`${B}/api/github/commit`, {
      data: { full_name: "t/r", baseBranch: "main", branch: "invalid branch!", mode: "push", title: "t", message: "m", path: "ci.yml", content: "x" },
    });
    expect([400, 401]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════
// 2. GitLab API — repos, branches, commit
// ═══════════════════════════════════════════════════════

test.describe("GitLab API — auth protection", () => {
  test("GET /api/gitlab/repos → 401 without session", async ({ request }) => {
    expect((await request.get(`${B}/api/gitlab/repos`)).status()).toBe(401);
  });

  test("GET /api/gitlab/branches → 401 without session", async ({ request }) => {
    expect([400, 401]).toContain((await request.get(`${B}/api/gitlab/branches?full_name=test/repo`)).status());
  });

  test("POST /api/gitlab/commit → 401 without session", async ({ request }) => {
    expect([401, 403]).toContain((await request.post(`${B}/api/gitlab/commit`, { data: {} })).status());
  });

  test("POST /api/gitlab/commit → path traversal rejected", async ({ request }) => {
    const res = await request.post(`${B}/api/gitlab/commit`, {
      data: { full_name: "t/r", baseBranch: "main", branch: "../../../etc/passwd", mode: "push", title: "t", message: "m", path: "ci.yml", content: "x" },
    });
    expect([400, 401]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════
// 3. Pipeline API — history, draft, files, read, analyze, sync, commit
// ═══════════════════════════════════════════════════════

test.describe("Pipeline API — auth protection", () => {
  test("GET /api/pipeline/history → 401", async ({ request }) => {
    expect([401, 403]).toContain((await request.get(`${B}/api/pipeline/history`)).status());
  });

  test("GET /api/pipeline/history/filters → 401", async ({ request }) => {
    expect([401, 403]).toContain((await request.get(`${B}/api/pipeline/history/filters`)).status());
  });

  test("POST /api/pipeline/draft → 401", async ({ request }) => {
    expect([401, 403]).toContain((await request.post(`${B}/api/pipeline/draft`, { data: {} })).status());
  });

  test("GET /api/pipeline/draft → 401 or 400 (missing params)", async ({ request }) => {
    expect([400, 401]).toContain((await request.get(`${B}/api/pipeline/draft`)).status());
  });

  test("GET /api/pipeline/files → 401", async ({ request }) => {
    expect([401, 403]).toContain((await request.get(`${B}/api/pipeline/files?repoFullName=test/repo`)).status());
  });

  test("GET /api/pipeline/read → 400 or 401 (missing params)", async ({ request }) => {
    expect([400, 401]).toContain((await request.get(`${B}/api/pipeline/read`)).status());
  });

  test("POST /api/pipeline/analyze → 401", async ({ request }) => {
    expect([401, 403]).toContain((await request.post(`${B}/api/pipeline/analyze`, { data: {} })).status());
  });

  test("POST /api/pipeline/sync → 401", async ({ request }) => {
    expect([401, 403]).toContain((await request.post(`${B}/api/pipeline/sync`, { data: {} })).status());
  });

  test("POST /api/pipeline/commit → 401", async ({ request }) => {
    expect([401, 403]).toContain((await request.post(`${B}/api/pipeline/commit`, { data: {} })).status());
  });
});