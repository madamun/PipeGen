import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "."), packages: path.resolve(__dirname, "./packages") } },
  test: {
    globals: true,
    coverage: {
      provider: "v8", reporter: ["text", "html", "lcov"], reportsDirectory: "./test-results/coverage",
      include: [
  "packages/lib/pipelineEngine.ts",
  "packages/lib/suggestions.ts",
  "packages/lib/utils.ts",
  "packages/server/actions.ts",
  "packages/server/github.ts",
  "packages/server/pipelineAnalyzer.ts",
],
      exclude: ["**/*.d.ts", "**/*.test.*", "**/node_modules/**"],
    },
    projects: [
      { test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node", setupFiles: ["./tests/setup/unit.setup.ts"] } },
      { plugins: [react()], test: { name: "component", include: ["tests/component/**/*.test.tsx"], environment: "jsdom", setupFiles: ["./tests/setup/component.setup.tsx"], css: true } },
      { test: { name: "integration", include: ["tests/integration/**/*.test.ts"], environment: "node", setupFiles: ["./tests/setup/integration.setup.ts"], testTimeout: 30000, pool: "forks", poolOptions: { forks: { singleFork: true } } } },
    ],
  },
});
