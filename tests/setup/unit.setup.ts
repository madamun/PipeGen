import { vi, beforeEach } from "vitest";
vi.mock("packages/server/prisma", () => ({
  prisma: {
    componentCategory: { findMany: vi.fn() }, pipelineComponent: { findMany: vi.fn(), create: vi.fn() },
    componentSyntax: { findMany: vi.fn() }, pipeline: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    pipelineDraft: { upsert: vi.fn(), deleteMany: vi.fn() }, pipelineHistory: { create: vi.fn(), findMany: vi.fn() },
    repository: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() }, account: { findFirst: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() }, $transaction: vi.fn(), $connect: vi.fn(), $disconnect: vi.fn(),
  }, Prisma: {},
}));
vi.mock("packages/server/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue({ session: { id: "s", userId: "u1" }, user: { id: "u1", name: "Test", email: "test@pipegen.dev" } }) } },
}));
beforeEach(() => { vi.clearAllMocks(); });
