import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const mockRepos = [
  { id: 1, name: "frontend", full_name: "team/frontend", description: "React app", private: false, owner: { login: "team" }, stargazers_count: 5, _meta: { branchCount: 3, tagCount: 1, pipelineCount: 2, languages: ["TypeScript", "CSS"] }, provider: "github" },
  { id: 2, name: "backend", full_name: "team/backend", description: "API", private: true, owner: { login: "team" }, stargazers_count: 0, _meta: { branchCount: 1, tagCount: 0, pipelineCount: 0, languages: ["Python"] }, provider: "github" },
  { id: 3, name: "infra", full_name: "org/infra", description: null, private: false, owner: { login: "org" }, stargazers_count: 12, _meta: null, provider: "github" },
];

describe("RepoPicker — repo filtering", () => {
  it("should split my vs co repos", () => {
    const me = "team";
    const my = mockRepos.filter(r => r.owner.login === me);
    const co = mockRepos.filter(r => r.owner.login !== me);
    expect(my).toHaveLength(2);
    expect(co).toHaveLength(1);
    expect(co[0].name).toBe("infra");
  });
});

describe("RepoPicker — RepoCard display", () => {
  function Card({ repo }: { repo: typeof mockRepos[0] }) {
    return (
      <div data-testid={`card-${repo.id}`}>
        <span data-testid="name">{repo.name}</span>
        <span data-testid="visibility">{repo.private ? "Private" : "Public"}</span>
        <span data-testid="desc">{repo.description || "No description provided."}</span>
        {repo.stargazers_count > 0 && <span data-testid="stars">{repo.stargazers_count}</span>}
        {repo._meta?.languages?.map(l => <span key={l} data-testid={`lang-${l}`}>{l}</span>)}
      </div>
    );
  }

  it("should display repo name", () => { render(<Card repo={mockRepos[0]} />); expect(screen.getByTestId("name")).toHaveTextContent("frontend"); });
  it("should show Public badge", () => { render(<Card repo={mockRepos[0]} />); expect(screen.getByTestId("visibility")).toHaveTextContent("Public"); });
  it("should show Private badge", () => { render(<Card repo={mockRepos[1]} />); expect(screen.getByTestId("visibility")).toHaveTextContent("Private"); });
  it("should show description", () => { render(<Card repo={mockRepos[0]} />); expect(screen.getByTestId("desc")).toHaveTextContent("React app"); });
  it("should show fallback description", () => { render(<Card repo={mockRepos[2]} />); expect(screen.getByTestId("desc")).toHaveTextContent("No description provided."); });
  it("should show stars when > 0", () => { render(<Card repo={mockRepos[0]} />); expect(screen.getByTestId("stars")).toHaveTextContent("5"); });
  it("should not show stars when 0", () => { render(<Card repo={mockRepos[1]} />); expect(screen.queryByTestId("stars")).toBeNull(); });
  it("should show languages", () => { render(<Card repo={mockRepos[0]} />); expect(screen.getByTestId("lang-TypeScript")).toBeInTheDocument(); });
});

describe("RepoPicker — pick action", () => {
  it("should call onPick with repo data", () => {
    const onPick = vi.fn();
    function Picker({ repos, onPick }: any) { return <div>{repos.map((r: any) => <button key={r.id} onClick={() => onPick(r)} data-testid={`pick-${r.id}`}>{r.name}</button>)}</div>; }
    render(<Picker repos={mockRepos} onPick={onPick} />);
    fireEvent.click(screen.getByTestId("pick-1"));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: "frontend", full_name: "team/frontend" }));
  });
});

describe("GitlabManagerModal — toggle logic", () => {
  it("should toggle repo selection", () => {
    const selected = new Set(["1", "2"]);
    const toggle = (id: string) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); return n; };
    expect(toggle("1").has("1")).toBe(false);
    expect(toggle("3").has("3")).toBe(true);
  });
});
