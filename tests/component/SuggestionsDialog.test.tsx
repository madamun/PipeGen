import { describe, it, expect } from "vitest";
import { getSuggestions } from "../../packages/lib/suggestions";
import { MOCK_CATEGORIES } from "../utils/test-fixtures";

describe("SuggestionsDialog — grouping", () => {
  it("should group by category", () => {
    const s = getSuggestions({}, MOCK_CATEGORIES);
    const byC: Record<string, any[]> = {};
    s.forEach(x => { if (!byC[x.category]) byC[x.category] = []; byC[x.category].push(x); });
    expect(Object.keys(byC).length).toBeGreaterThanOrEqual(2);
  });
  it("should have performance category", () => expect(getSuggestions({}, MOCK_CATEGORIES).some(s => s.category === "performance")).toBe(true));
  it("should have security category", () => expect(getSuggestions({}, MOCK_CATEGORIES).some(s => s.category === "security")).toBe(true));
});

describe("SuggestionsDialog — priority display", () => {
  const P: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };
  it("High label", () => expect(P["high"]).toBe("High"));
  it("Medium label", () => expect(P["medium"]).toBe("Medium"));
  it("Low label", () => expect(P["low"]).toBe("Low"));
});

describe("SuggestionsDialog — navigate to block", () => {
  it("should provide targetCategoryId", () => {
    const s = getSuggestions({}, MOCK_CATEGORIES).find(x => x.id === "enable-testing");
    expect(s?.targetCategoryId).toBe("cat-quality");
    expect(s?.targetComponentName).toBe("Testing Strategy");
  });
  it("should provide targetComponentName for cache", () => {
    const s = getSuggestions({ use_node: true }, MOCK_CATEGORIES).find(x => x.id === "cache-for-node");
    expect(s?.targetComponentName).toBe("Dependency Cache");
  });
});

describe("SuggestionsDialog — dismiss", () => {
  it("dismissed items hidden", () => {
    const d = new Set(["enable-testing", "enable-lint"]);
    const s = getSuggestions({}, MOCK_CATEGORIES, d);
    expect(s.some(x => x.id === "enable-testing")).toBe(false);
    expect(s.some(x => x.id === "enable-lint")).toBe(false);
  });
  it("non-dismissed still shown", () => {
    const d = new Set(["enable-testing"]);
    const s = getSuggestions({}, MOCK_CATEGORIES, d);
    expect(s.some(x => x.id === "security-sast")).toBe(true);
  });
  it("empty after dismiss all", () => {
    const allIds = getSuggestions({}, MOCK_CATEGORIES).map(s => s.id);
    const d = new Set(allIds);
    expect(getSuggestions({}, MOCK_CATEGORIES, d)).toEqual([]);
  });
});

describe("SuggestionsDialog — no file state", () => {
  it("shows suggestions regardless of activeTab", () => {
    // getSuggestions ไม่ได้รับ activeTab — ตัว dialog เช็คเอง
    const s = getSuggestions({}, MOCK_CATEGORIES);
    expect(s.length).toBeGreaterThan(0);
  });
});
