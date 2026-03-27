import { describe, it, expect, beforeEach } from "vitest";
import { testPrisma } from "../setup/integration.setup";

// ใช้ upsert แทน create เพื่อป้องกัน duplicate
async function setupTestData() {
  const user = await testPrisma.user.upsert({
    where: { id: "test-crud-user" },
    create: { id: "test-crud-user", name: "Test", email: "crud@test.dev", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    update: {},
  });

  // ลบ repo เก่าก่อนสร้างใหม่
  await testPrisma.pipeline.deleteMany({ where: { createdById: user.id } });
  await testPrisma.repository.deleteMany({ where: { userId: user.id } });

  const repo = await testPrisma.repository.create({
    data: { userId: user.id, fullName: "test/crud-repo", provider: "github", providerRepoId: "crud-123" },
  });

  return { user, repo };
}

describe("Pipeline CRUD — Real DB", () => {
  let user: any, repo: any;
  beforeEach(async () => {
    const data = await setupTestData();
    user = data.user;
    repo = data.repo;
  });

  describe("Repository", () => {
    it("should create repo linked to user", async () => {
      const repos = await testPrisma.repository.findMany({ where: { userId: user.id } });
      expect(repos.length).toBeGreaterThanOrEqual(1);
      expect(repos[0].provider).toBe("github");
    });
  });

  describe("Pipeline", () => {
    it("should create pipeline", async () => {
      const p = await testPrisma.pipeline.create({
        data: { repoId: repo.id, createdById: user.id, name: "main.yml", filePath: ".github/workflows/main.yml", branch: "main" },
      });
      expect(p.name).toBe("main.yml");
      expect(p.branch).toBe("main");
    });

    it("should allow same file on different branches", async () => {
      await testPrisma.pipeline.create({ data: { repoId: repo.id, createdById: user.id, name: "ci.yml", filePath: ".github/workflows/ci.yml", branch: "main" } });
      const p2 = await testPrisma.pipeline.create({ data: { repoId: repo.id, createdById: user.id, name: "ci.yml", filePath: ".github/workflows/ci.yml", branch: "develop" } });
      expect(p2.branch).toBe("develop");
    });

    it("should upsert correctly", async () => {
      const args = { where: { repoId_filePath_branch: { repoId: repo.id, filePath: ".github/workflows/up.yml", branch: "main" } }, create: { repoId: repo.id, createdById: user.id, name: "up.yml", filePath: ".github/workflows/up.yml", branch: "main" }, update: { updatedAt: new Date() } };
      const p1 = await testPrisma.pipeline.upsert(args);
      const p2 = await testPrisma.pipeline.upsert(args);
      expect(p1.id).toBe(p2.id);
    });
  });

  describe("PipelineDraft", () => {
    it("should create and retrieve draft", async () => {
      const pipeline = await testPrisma.pipeline.create({ data: { repoId: repo.id, createdById: user.id, name: "d.yml", filePath: ".github/workflows/d.yml", branch: "main" } });
      await testPrisma.pipelineDraft.create({ data: { pipelineId: pipeline.id, configuration: "name: CI" } });
      const found = await testPrisma.pipeline.findUnique({ where: { id: pipeline.id }, include: { drafts: true } });
      expect(found?.drafts?.configuration).toContain("name: CI");
    });

    it("should upsert draft", async () => {
      const pipeline = await testPrisma.pipeline.create({ data: { repoId: repo.id, createdById: user.id, name: "du.yml", filePath: ".github/workflows/du.yml", branch: "main" } });
      await testPrisma.pipelineDraft.create({ data: { pipelineId: pipeline.id, configuration: "v1" } });
      const updated = await testPrisma.pipelineDraft.upsert({ where: { pipelineId: pipeline.id }, create: { pipelineId: pipeline.id, configuration: "new" }, update: { configuration: "v2" } });
      expect(updated.configuration).toBe("v2");
    });
  });

  describe("PipelineHistory", () => {
    it("should create and filter history", async () => {
      await testPrisma.pipelineHistory.createMany({ data: [
        { userId: user.id, provider: "github", repoFullName: "test/repo", branch: "main", filePath: "ci.yml", commitMessage: "push1", actionType: "push", yamlContent: "test" },
        { userId: user.id, provider: "github", repoFullName: "test/repo", branch: "main", filePath: "ci.yml", commitMessage: "pr1", actionType: "pull_request", yamlContent: "test" },
        { userId: user.id, provider: "gitlab", repoFullName: "test/repo2", branch: "main", filePath: ".gitlab-ci.yml", commitMessage: "push2", actionType: "push", yamlContent: "test" },
      ] });
      expect(await testPrisma.pipelineHistory.findMany({ where: { userId: user.id, actionType: "push" } })).toHaveLength(2);
      expect(await testPrisma.pipelineHistory.findMany({ where: { userId: user.id, provider: "gitlab" } })).toHaveLength(1);
    });

    it("should order by createdAt desc", async () => {
      await testPrisma.pipelineHistory.create({ data: { userId: user.id, provider: "github", repoFullName: "t/r", branch: "main", filePath: "ci.yml", commitMessage: "first", actionType: "push", yamlContent: "t" } });
      await new Promise(r => setTimeout(r, 50));
      await testPrisma.pipelineHistory.create({ data: { userId: user.id, provider: "github", repoFullName: "t/r", branch: "main", filePath: "ci.yml", commitMessage: "second", actionType: "push", yamlContent: "t" } });
      const results = await testPrisma.pipelineHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
      expect(results[0].commitMessage).toBe("second");
    });
  });

  describe("ComponentCategory", () => {
    it("should create with components + syntaxes", async () => {
      const cat = await testPrisma.componentCategory.create({ data: { name: "TestCat", slug: "test-cat-" + Date.now(), displayOrder: 1, icon: "Box" } });
      const comp = await testPrisma.pipelineComponent.create({ data: { categoryId: cat.id, name: "TestComp", type: "group" } });
      await testPrisma.componentSyntax.create({ data: { componentId: comp.id, platform: "github", template: "- run: npm test" } });
      const result = await testPrisma.componentCategory.findUnique({ where: { id: cat.id }, include: { components: { include: { syntaxes: true } } } });
      expect(result?.components).toHaveLength(1);
      expect(result?.components[0].syntaxes).toHaveLength(1);
    });

    it("should order by displayOrder", async () => {
      const ts = Date.now();
      await testPrisma.componentCategory.create({ data: { name: "C", slug: "c-" + ts, displayOrder: 30 } });
      await testPrisma.componentCategory.create({ data: { name: "A", slug: "a-" + ts, displayOrder: 10 } });
      await testPrisma.componentCategory.create({ data: { name: "B", slug: "b-" + ts, displayOrder: 20 } });
      const cats = await testPrisma.componentCategory.findMany({ where: { slug: { contains: String(ts) } }, orderBy: { displayOrder: "asc" } });
      expect(cats.map(c => c.name)).toEqual(["A", "B", "C"]);
    });
  });
});