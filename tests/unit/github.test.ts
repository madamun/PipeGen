import { describe, it, expect, vi, beforeEach } from "vitest";
const mp = vi.hoisted(() => ({ account: { findFirst: vi.fn() } }));
vi.mock("../../packages/server/prisma", () => ({ prisma: mp, Prisma: {} }));
import { getGithubAccount, getGithubToken } from "../../packages/server/github";
beforeEach(() => vi.clearAllMocks());

describe("getGithubAccount", () => {
  it("finds account", async () => { mp.account.findFirst.mockResolvedValue({ id: "a1", accessToken: "ghp_abc" }); const r = await getGithubAccount("u1"); expect(r?.accessToken).toBe("ghp_abc"); expect(mp.account.findFirst).toHaveBeenCalledWith({ where: { userId: "u1", providerId: "github" } }); });
  it("null when not found", async () => { mp.account.findFirst.mockResolvedValue(null); expect(await getGithubAccount("u9")).toBeNull(); });
});

describe("getGithubToken", () => {
  it("returns token", async () => { mp.account.findFirst.mockResolvedValue({ accessToken: "ghp_tok" }); expect(await getGithubToken("u1")).toBe("ghp_tok"); });
  it("null when no account", async () => { mp.account.findFirst.mockResolvedValue(null); expect(await getGithubToken("u9")).toBeNull(); });
  it("null when token is null", async () => { mp.account.findFirst.mockResolvedValue({ accessToken: null }); expect(await getGithubToken("u1")).toBeNull(); });
});
