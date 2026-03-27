import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

function isFieldVisible(field: any, values: Record<string, any>) {
  if (!field.visibleIf) return true;
  return values[field.visibleIf.fieldId] === field.visibleIf.value;
}

describe("visibleIf logic", () => {
  it("visible without condition", () => expect(isFieldVisible({ id: "x" }, {})).toBe(true));
  it("visible when met", () => expect(isFieldVisible({ id: "x", visibleIf: { fieldId: "use_node", value: true } }, { use_node: true })).toBe(true));
  it("hidden when not met", () => expect(isFieldVisible({ id: "x", visibleIf: { fieldId: "use_node", value: true } }, { use_node: false })).toBe(false));
  it("hidden when undefined", () => expect(isFieldVisible({ id: "x", visibleIf: { fieldId: "use_node", value: true } }, {})).toBe(false));
});

describe("switch field", () => {
  function Sw({ id, label, checked, onChange }: any) { return <div><input type="checkbox" role="switch" id={id} checked={checked} onChange={e => onChange(e.target.checked)} data-testid={`sw-${id}`} /><label htmlFor={id}>{label}</label></div>; }
  it("renders label", () => { render(<Sw id="x" label="Enable Node.js" checked={false} onChange={() => {}} />); expect(screen.getByText("Enable Node.js")).toBeInTheDocument(); });
  it("calls onChange", () => { const fn = vi.fn(); render(<Sw id="x" label="X" checked={false} onChange={fn} />); fireEvent.click(screen.getByTestId("sw-x")); expect(fn).toHaveBeenCalledWith(true); });
  it("reflects checked", () => { render(<Sw id="x" label="X" checked={true} onChange={() => {}} />); expect(screen.getByTestId("sw-x")).toBeChecked(); });
});

describe("select field", () => {
  function Sel({ id, label, value, options, onChange }: any) { return <div><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={e => onChange(e.target.value)} data-testid={`sel-${id}`}>{options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }
  const opts = [{ label: "npm", value: "npm" }, { label: "yarn", value: "yarn" }, { label: "pnpm", value: "pnpm" }, { label: "bun", value: "bun" }];
  it("renders all options", () => { render(<Sel id="pkg" label="PM" value="npm" options={opts} onChange={() => {}} />); expect(screen.getByText("npm")).toBeInTheDocument(); expect(screen.getByText("yarn")).toBeInTheDocument(); expect(screen.getByText("bun")).toBeInTheDocument(); });
  it("calls onChange", () => { const fn = vi.fn(); render(<Sel id="pkg" label="PM" value="npm" options={opts} onChange={fn} />); fireEvent.change(screen.getByTestId("sel-pkg"), { target: { value: "yarn" } }); expect(fn).toHaveBeenCalledWith("yarn"); });
  it("shows current value", () => { render(<Sel id="pkg" label="PM" value="pnpm" options={opts} onChange={() => {}} />); expect((screen.getByTestId("sel-pkg") as HTMLSelectElement).value).toBe("pnpm"); });
});

describe("input field", () => {
  function Inp({ id, label, value, placeholder, onChange }: any) { return <div><label htmlFor={id}>{label}</label><input id={id} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} data-testid={`inp-${id}`} /></div>; }
  it("renders placeholder", () => { render(<Inp id="name" label="Name" value="" placeholder="e.g. Build" onChange={() => {}} />); expect(screen.getByPlaceholderText("e.g. Build")).toBeInTheDocument(); });
  it("calls onChange", () => { const fn = vi.fn(); render(<Inp id="name" label="Name" value="" placeholder="" onChange={fn} />); fireEvent.change(screen.getByTestId("inp-name"), { target: { value: "My-CI" } }); expect(fn).toHaveBeenCalledWith("My-CI"); });
});

describe("branch_select multi-select", () => {
  function Br({ branches, selected, onChange }: any) { return <div>{branches.map((b: string) => <label key={b} data-testid={`br-${b}`}><input type="checkbox" checked={selected.includes(b)} onChange={e => onChange(e.target.checked ? [...selected, b] : selected.filter((x: string) => x !== b))} />{b}</label>)}</div>; }
  it("renders branches", () => { render(<Br branches={["main", "develop"]} selected={[]} onChange={() => {}} />); expect(screen.getByText("main")).toBeInTheDocument(); expect(screen.getByText("develop")).toBeInTheDocument(); });
  it("toggle on", () => { const fn = vi.fn(); render(<Br branches={["main", "develop"]} selected={["main"]} onChange={fn} />); fireEvent.click(screen.getByTestId("br-develop").querySelector("input")!); expect(fn).toHaveBeenCalledWith(["main", "develop"]); });
  it("toggle off", () => { const fn = vi.fn(); render(<Br branches={["main", "develop"]} selected={["main", "develop"]} onChange={fn} />); fireEvent.click(screen.getByTestId("br-main").querySelector("input")!); expect(fn).toHaveBeenCalledWith(["develop"]); });
});

describe("linkedFields resolution", () => {
  function resolve(fieldId: string, value: any, fields: any[]) {
    const upd: Record<string, any> = {}; const f = fields.find((x: any) => x.id === fieldId);
    if (f?.linkedFields) { Object.entries(f.linkedFields).forEach(([tid, m]: any) => { const v = m[String(value)]; if (v !== undefined) upd[tid] = v; }); }
    return upd;
  }
  const pkgField = { id: "pkg_manager", linkedFields: { install_cmd: { npm: "npm ci", yarn: "yarn install --frozen-lockfile" }, test_cmd: { npm: "npm test", yarn: "yarn test" } } };
  it("npm linked", () => { const r = resolve("pkg_manager", "npm", [pkgField]); expect(r.install_cmd).toBe("npm ci"); expect(r.test_cmd).toBe("npm test"); });
  it("yarn linked", () => expect(resolve("pkg_manager", "yarn", [pkgField]).install_cmd).toBe("yarn install --frozen-lockfile"));
  it("unknown field → empty", () => expect(resolve("x", "v", [pkgField])).toEqual({}));
  it("unknown value → empty", () => expect(resolve("pkg_manager", "deno", [pkgField])).toEqual({}));
});
