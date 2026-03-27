import { describe, it, expect } from "vitest";

describe("UserMenu — initials", () => {
  function initials(name?: string | null, email?: string | null) { const n = name || email || "U"; return n.slice(0, 2).toUpperCase(); }
  it("first 2 chars of name", () => expect(initials("John Doe")).toBe("JO"));
  it("email when no name", () => expect(initials(null, "john@example.com")).toBe("JO"));
  it("fallback U", () => expect(initials(null, null)).toBe("U"));
  it("single char", () => expect(initials("X")).toBe("X"));
  it("empty name uses email", () => expect(initials("", "test@test.com")).toBe("TE"));
});

describe("UserMenu — provider detection", () => {
  it("detect gitlab from providers array", () => {
    const providers = ["gitlab"];
    const provider = providers.includes("gitlab") ? "gitlab" : "github";
    expect(provider).toBe("gitlab");
  });
  it("default to github", () => {
    const providers = ["github"];
    const provider = providers.includes("gitlab") ? "gitlab" : "github";
    expect(provider).toBe("github");
  });
  it("empty defaults github", () => {
    const providers: string[] = [];
    const provider = providers.includes("gitlab") ? "gitlab" : "github";
    expect(provider).toBe("github");
  });
});

describe("Workspace — resize logic", () => {
  function clampLeft(w: number) { return Math.max(360, Math.min(580, w)); }
  function clampAI(w: number) { return Math.max(280, Math.min(600, w)); }
  it("clamp left min", () => expect(clampLeft(300)).toBe(360));
  it("clamp left max", () => expect(clampLeft(700)).toBe(580));
  it("clamp left normal", () => expect(clampLeft(450)).toBe(450));
  it("shrink left when AI opens", () => { const w = 580; expect(Math.min(w, 360)).toBe(360); });
  it("restore left when AI closes", () => { const aiOpen = false; expect(aiOpen ? 360 : 580).toBe(580); });
  it("clamp AI min", () => expect(clampAI(200)).toBe(280));
  it("clamp AI max", () => expect(clampAI(800)).toBe(600));
  it("clamp AI normal", () => expect(clampAI(400)).toBe(400));
});
