"use client";
import * as React from "react";

type TriggerCfg = { enabled: boolean; branches: string[] };
type Triggers = { push?: TriggerCfg; pull_request?: TriggerCfg };

// เก็บ repo ที่ผู้ใช้เลือก (เก็บแค่นี้ก็พอใช้ได้แล้ว)
export type SelectedRepo = { id: number; name: string; full_name: string } | null;

type Ctx = {
  // preview YAML
  yaml: string;
  setYaml: React.Dispatch<React.SetStateAction<string>>;

  // triggers
  triggers: Triggers;
  setTriggers: React.Dispatch<React.SetStateAction<Triggers>>;

  // ภาษา / อื่นๆ
  language: string;
  setLanguage: (l: string) => void;

  // repo + branch ที่เลือก
  selectedRepo: SelectedRepo;
  setSelectedRepo: (r: SelectedRepo) => void;
  selectedBranch: string;
  setSelectedBranch: (b: string) => void;
};

const PipelineCtx = React.createContext<Ctx | undefined>(undefined);

const INITIAL_YAML = `on:
  # will be filled by UI
language: git
steps:
  - build
  - test
`;

/** === helpers ทำ on: block แบบ idempotent === */
function renderOnBlock(t: Triggers, branch: string) {
  const parts: string[] = ["on:"];
  if (t.push?.enabled) {
    const bs = (t.push.branches?.length ? t.push.branches : [branch]).map(b => JSON.stringify(b)).join(", ");
    parts.push(`  push:\n    branches: [${bs}]`);
  }
  if (t.pull_request?.enabled) {
    const bs = (t.pull_request.branches?.length ? t.pull_request.branches : [branch]).map(b => JSON.stringify(b)).join(", ");
    parts.push(`  pull_request:\n    branches: [${bs}]`);
  }
  return parts.join("\n");
}

function upsertOnBlock(y: string, block: string) {
  const re = /^\s*on\s*:\s*[\s\S]*?(?=^\S|\Z)/m;
  if (re.test(y)) return y.replace(re, block + "\n");
  return block + "\n" + y;
}

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [yaml, setYaml] = React.useState(INITIAL_YAML);
  const [language, setLanguage] = React.useState("git");

  const [triggers, setTriggers] = React.useState<Triggers>({});
  const [selectedRepo, setSelectedRepo] = React.useState<SelectedRepo>(null);
  const [selectedBranch, setSelectedBranch] = React.useState<string>("main");

  // เขียน YAML ใหม่ทุกครั้งที่ triggers/branch เปลี่ยน (แทนที่ block on: เดิม)
  React.useEffect(() => {
    setYaml(prev => upsertOnBlock(prev, renderOnBlock(triggers, selectedBranch || "main")));
  }, [triggers, selectedBranch]);

  const value: Ctx = {
    yaml, setYaml,
    triggers, setTriggers,
    language, setLanguage,
    selectedRepo, setSelectedRepo,
    selectedBranch, setSelectedBranch,
  };

  return <PipelineCtx.Provider value={value}>{children}</PipelineCtx.Provider>;
}

export function usePipeline() {
  const ctx = React.useContext(PipelineCtx);
  if (!ctx) throw new Error("usePipeline must be used inside <PipelineProvider>");
  return ctx;
}
