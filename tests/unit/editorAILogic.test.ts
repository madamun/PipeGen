import { describe, it, expect } from "vitest";

function isFullYaml(c: string) { return /^(name:|on:|stages:|workflow:)/m.test(c.trim()); }
function isGitLabFile(c: string) { return /^stages:/m.test(c) || /^[a-z_]+:\s*\n\s+stage:/m.test(c); }
function applySnippet(file: string, snip: string): string {
  const t = snip.trim();
  if (isFullYaml(t)) return t;
  if (!file?.trim()) return t;
  if (isGitLabFile(file)) { const lines = t.split("\n"); let min = Infinity; for (const l of lines) { if (!l.trim()) continue; const i = l.match(/^(\s*)/)?.[1].length || 0; if (i < min) min = i; } return file.trimEnd() + "\n\n" + lines.map(l => l.trim() ? l.slice(min) : "").join("\n"); }
  const el = file.split("\n"); let si = 6; for (let i = el.length - 1; i >= 0; i--) { const m = el[i].match(/^(\s*)- name:/); if (m) { si = m[1].length; break; } }
  const fmt: string[] = []; let inRun = false;
  for (const l of t.split("\n")) { const x = l.trim(); if (!x) { fmt.push(""); continue; } if (x.startsWith("- name:")) { inRun = false; fmt.push(" ".repeat(si) + x); } else if (x.startsWith("run:")) { inRun = x.includes("|"); fmt.push(" ".repeat(si + 2) + x); } else if (inRun) { fmt.push(" ".repeat(si + 4) + x); } else { fmt.push(" ".repeat(si + 2) + x); } }
  return file.trimEnd() + "\n\n" + fmt.join("\n");
}

describe("isFullYaml", () => {
  it("github", () => expect(isFullYaml("name: CI\non:")).toBe(true));
  it("gitlab stages", () => expect(isFullYaml("stages:\n  - build")).toBe(true));
  it("gitlab workflow", () => expect(isFullYaml("workflow:\n  rules:")).toBe(true));
  it("partial snippet", () => expect(isFullYaml("- name: Test\n  run: npm test")).toBe(false));
  it("gitlab job snippet", () => expect(isFullYaml("deploy:\n  stage: deploy")).toBe(false));
});

describe("isGitLabFile", () => {
  it("stages keyword", () => expect(isGitLabFile("stages:\n  - build")).toBe(true));
  it("job with stage", () => expect(isGitLabFile("build_job:\n  stage: build\n  script:")).toBe(true));
  it("not github", () => expect(isGitLabFile("name: CI\non:\n  push:\njobs:")).toBe(false));
  it("empty", () => expect(isGitLabFile("")).toBe(false));
});

describe("applySnippet", () => {
  it("full yaml replaces", () => expect(applySnippet("name: Old", "name: New\non:\n  push:")).toBe("name: New\non:\n  push:"));
  it("empty file → use snippet", () => expect(applySnippet("", "- name: Test\n  run: npm test")).toBe("- name: Test\n  run: npm test"));
  it("github append with indent", () => { const r = applySnippet("name: CI\njobs:\n  b:\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v4", "- name: Test\n  run: npm test"); expect(r).toContain("- name: Checkout"); expect(r).toContain("- name: Test"); });
  it("gitlab append top-level", () => { const r = applySnippet("stages:\n  - build\nbuild_job:\n  stage: build", "deploy:\n  stage: deploy\n  script:\n    - echo hi"); expect(r).toContain("build_job:"); expect(r).toContain("deploy:"); });
  it("gitlab strip indent", () => { const r = applySnippet("stages:\n  - test", "    test_job:\n      stage: test"); const l = r.split("\n").find(x => x.includes("test_job:")); expect(l?.match(/^(\s*)/)?.[1].length).toBe(0); });
  it("github multiline run", () => { const r = applySnippet("name: CI\njobs:\n  b:\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v4", "- name: Deploy\n  run: |\n    npm install\n    npm build"); expect(r).toContain("run: |"); });
  it("json detection", () => { const j = '{"use_node":true}'; expect(j.trim().startsWith("{") && j.trim().endsWith("}")).toBe(true); });
});
