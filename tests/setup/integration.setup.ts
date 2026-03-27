import { beforeAll, afterAll, vi } from "vitest";

process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/pipegen_test";

// ไม่ mock prisma — ใช้ของจริงเลย
const { prisma: testPrisma } = await import("../../packages/server/prisma");

vi.mock("packages/server/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue({ session: { id: "s", userId: "u1" }, user: { id: "u1", name: "Test", email: "test@pipegen.dev" } }) } },
}));

beforeAll(async () => { await testPrisma.$connect(); });
afterAll(async () => { await testPrisma.$disconnect(); });

export { testPrisma };

export const factories = {
  createUser: (o = {}) => testPrisma.user.create({ data: { id: "u1", name: "Test", email: "test@pipegen.dev", emailVerified: true, createdAt: new Date(), updatedAt: new Date(), ...o } }),
  createRepo: (o = {}) => testPrisma.repository.create({ data: { userId: "u1", fullName: "test/repo", provider: "github", providerRepoId: "123", ...o } }),
  createCategory: (o = {}) => testPrisma.componentCategory.create({ data: { name: "Build", slug: "build", displayOrder: 1, icon: "Box", ...o } }),
  createComponent: (catId: string, o = {}) => testPrisma.pipelineComponent.create({ data: { categoryId: catId, name: "Node.js Build", type: "group", ...o } }),
  createPipeline: (repoId: string, o = {}) => testPrisma.pipeline.create({ data: { repoId, createdById: "u1", name: "main.yml", filePath: ".github/workflows/main.yml", branch: "main", ...o } }),
};