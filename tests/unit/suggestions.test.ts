import { describe, it, expect } from "vitest";
import { getSuggestions } from "../../packages/lib/suggestions";
import { MOCK_CATEGORIES } from "../utils/test-fixtures";
import type { ComponentValues } from "../../packages/types/pipeline";

describe("getSuggestions", () => {
  it("should return many suggestions when nothing enabled", () => expect(getSuggestions({}, MOCK_CATEGORIES).length).toBeGreaterThanOrEqual(5));
  it("should suggest select-language", () => expect(getSuggestions({}, MOCK_CATEGORIES).some(s => s.id === "select-language")).toBe(true));
  it("should NOT suggest language when Node enabled", () => expect(getSuggestions({ use_node: true }, MOCK_CATEGORIES).some(s => s.id === "select-language")).toBe(false));
  it("should NOT suggest language when Python enabled", () => expect(getSuggestions({ use_python: true }, MOCK_CATEGORIES).some(s => s.id === "select-language")).toBe(false));
  it("should suggest testing", () => expect(getSuggestions({}, MOCK_CATEGORIES).some(s => s.id === "enable-testing")).toBe(true));
  it("should NOT suggest testing when enabled", () => expect(getSuggestions({ run_tests: true }, MOCK_CATEGORIES).some(s => s.id === "enable-testing")).toBe(false));
  it("should suggest cache for Node", () => expect(getSuggestions({ use_node: true }, MOCK_CATEGORIES).some(s => s.id === "cache-for-node")).toBe(true));
  it("should NOT suggest cache when enabled", () => expect(getSuggestions({ use_node: true, enable_cache: true }, MOCK_CATEGORIES).some(s => s.id === "cache-for-node")).toBe(false));
  it("should NOT suggest cache without Node", () => expect(getSuggestions({ use_python: true }, MOCK_CATEGORIES).some(s => s.id === "cache-for-node")).toBe(false));
  it("should suggest coverage when tests on", () => expect(getSuggestions({ run_tests: true }, MOCK_CATEGORIES).some(s => s.id === "enable-coverage")).toBe(true));
  it("should NOT suggest coverage without tests", () => expect(getSuggestions({}, MOCK_CATEGORIES).some(s => s.id === "enable-coverage")).toBe(false));
  it("should respect dismissed", () => { const d = new Set(["select-language", "enable-testing"]); const r = getSuggestions({}, MOCK_CATEGORIES, d); expect(r.some(s => s.id === "select-language")).toBe(false); expect(r.some(s => s.id === "enable-testing")).toBe(false); });
  it("should return 0 when everything enabled", () => expect(getSuggestions({ use_node: true, enable_cache: true, run_tests: true, check_quality: true, enable_security: true, enable_coverage: true, run_build: true, docker_build: true, deploy_vercel: true, enable_slack: true }, MOCK_CATEGORIES)).toEqual([]));
  it("should include correct targetCategoryId", () => { const s = getSuggestions({}, MOCK_CATEGORIES).find(s => s.id === "select-language"); expect(s?.targetCategoryId).toBe("cat-runtime"); });
  it("should have correct priority", () => { const s = getSuggestions({}, MOCK_CATEGORIES); expect(s.find(x => x.id === "select-language")?.priority).toBe("high"); expect(s.find(x => x.id === "enable-docker")?.priority).toBe("low"); });
  it("should return [] for empty categories", () => expect(getSuggestions({}, [])).toEqual([]));
});
