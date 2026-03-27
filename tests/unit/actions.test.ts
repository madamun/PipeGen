import { describe, it, expect, vi, beforeEach } from "vitest";
const mp = vi.hoisted(() => ({ componentCategory: { findMany: vi.fn() } }));
vi.mock("../../packages/server/prisma", () => ({ prisma: mp, Prisma: {} }));
import { getPipelineComponents } from "../../packages/server/actions";
beforeEach(() => vi.clearAllMocks());
describe("getPipelineComponents", () => {
  it("success returns categories", async () => { mp.componentCategory.findMany.mockResolvedValue([{ id: "c1", name: "General", components: [{ id: "p1", syntaxes: [] }] }]); const r = await getPipelineComponents(); expect(r.success).toBe(true); expect(r.data).toHaveLength(1); });
  it("calls findMany with correct params", async () => { mp.componentCategory.findMany.mockResolvedValue([]); await getPipelineComponents(); expect(mp.componentCategory.findMany).toHaveBeenCalledWith({ orderBy: { displayOrder: "asc" }, include: { components: { include: { syntaxes: true } } } }); });
  it("error returns empty", async () => { mp.componentCategory.findMany.mockRejectedValue(new Error("DB down")); const r = await getPipelineComponents(); expect(r.success).toBe(false); expect(r.data).toEqual([]); });
});
