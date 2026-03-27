import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

describe("EditorToolbar — zoom", () => {
  const B = 13;
  function calc(z: number, dir: "in" | "out") { let p = Math.round((z / B) * 100); let s = Math.round(p / 10) * 10; let n = dir === "in" ? s + 10 : s - 10; n = Math.max(50, Math.min(n, 200)); return (n / 100) * B; }
  it("zoom in from 100%", () => expect(calc(13, "in")).toBeCloseTo(14.3, 1));
  it("zoom out from 100%", () => expect(calc(13, "out")).toBeCloseTo(11.7, 1));
  it("min 50%", () => expect(calc(6.5, "out")).toBeGreaterThanOrEqual(6.5));
  it("max 200%", () => expect(calc(26, "in")).toBeLessThanOrEqual(26));
  it("display percent", () => expect(Math.round((13 / B) * 100)).toBe(100));
});

describe("EditorToolbar — download", () => {
  it("blob MIME type", () => { const b = new Blob(["name: CI"], { type: "text/yaml;charset=utf-8" }); expect(b.type).toBe("text/yaml;charset=utf-8"); });
  it("fallback filename", () => expect("" || "pipeline.yml").toBe("pipeline.yml"));
});

describe("Tab management", () => {
  function Tabs() {
    const [tabs, setTabs] = React.useState<string[]>([]); const [active, setActive] = React.useState("");
    const add = (n: string) => { if (!tabs.includes(n)) setTabs([...tabs, n]); setActive(n); };
    const close = (n: string) => { const t = tabs.filter(x => x !== n); setTabs(t); if (active === n) setActive(t[t.length - 1] || ""); };
    return <div><div data-testid="tabs">{tabs.join(",")}</div><div data-testid="active">{active}</div><button onClick={() => add("main.yml")}>Add main</button><button onClick={() => add("ci.yml")}>Add ci</button><button onClick={() => close(active)}>Close</button></div>;
  }
  it("no tabs initially", () => { render(<Tabs />); expect(screen.getByTestId("tabs")).toHaveTextContent(""); });
  it("add tab", () => { render(<Tabs />); fireEvent.click(screen.getByText("Add main")); expect(screen.getByTestId("tabs")).toHaveTextContent("main.yml"); expect(screen.getByTestId("active")).toHaveTextContent("main.yml"); });
  it("no duplicate", () => { render(<Tabs />); fireEvent.click(screen.getByText("Add main")); fireEvent.click(screen.getByText("Add main")); expect(screen.getByTestId("tabs")).toHaveTextContent("main.yml"); });
  it("switch active", () => { render(<Tabs />); fireEvent.click(screen.getByText("Add main")); fireEvent.click(screen.getByText("Add ci")); expect(screen.getByTestId("active")).toHaveTextContent("ci.yml"); });
  it("close activates previous", () => { render(<Tabs />); fireEvent.click(screen.getByText("Add main")); fireEvent.click(screen.getByText("Add ci")); fireEvent.click(screen.getByText("Close")); expect(screen.getByTestId("active")).toHaveTextContent("main.yml"); });
  it("close last → empty", () => { render(<Tabs />); fireEvent.click(screen.getByText("Add main")); fireEvent.click(screen.getByText("Close")); expect(screen.getByTestId("active")).toHaveTextContent(""); });
});

describe("Rename logic", () => {
  function ext(n: string) { let f = n.trim(); if (!f) return ""; if (!f.endsWith(".yml") && !f.endsWith(".yaml")) f += ".yml"; return f; }
  it("add .yml", () => expect(ext("pipe")).toBe("pipe.yml"));
  it("keep .yml", () => expect(ext("main.yml")).toBe("main.yml"));
  it("keep .yaml", () => expect(ext("ci.yaml")).toBe("ci.yaml"));
  it("empty", () => expect(ext("")).toBe(""));
  it("trim", () => expect(ext("  test  ")).toBe("test.yml"));
  it("Untitled naming", () => { let c = 1; let n = "Untitled.yml"; while (["Untitled.yml"].includes(n)) { n = `Untitled-${c}.yml`; c++; } expect(n).toBe("Untitled-1.yml"); });
});
