import { SelectedRepo } from "@/components/workspace/PipelineProvider";

// 1. ดึงรายชื่อ Repos พร้อม Metadata
export async function fetchRepos() {
  const res = await fetch("/api/github/repos");
  if (!res.ok) throw new Error("Failed to fetch repos");
  return res.json();
}

// 2. ดึง Branches ของ Repo ที่เลือก
export async function fetchBranches(fullName: string) {
  const res = await fetch(`/api/github/branches?full_name=${encodeURIComponent(fullName)}`);
  if (!res.ok) throw new Error("Failed to fetch branches");
  const data = await res.json();
  return data.branches as { name: string; protected: boolean }[];
}

// 3. สั่ง Commit / PR (พระเอกของเรา)
export type CommitPayload = {
  full_name: string;
  baseBranch: string;
  mode: "push" | "pull_request";
  title: string;
  message: string;
  path: string;
  content: string; // YAML string
};

export async function commitFile(payload: CommitPayload) {
  const res = await fetch("/api/github/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Commit failed");
  return data; // คืนค่า { ok: true, html_url: "..." }
}