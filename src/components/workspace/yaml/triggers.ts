// แข็งแรงขึ้น: เทียบค่าแบบ deep, เขียน/แทนที่บล็อก on: อย่างปลอดภัย
export type TriggerState = {
  push: { enabled: boolean; branches: string[] };
  pull_request: { enabled: boolean; branches: string[] };
};

export function readTriggersFromYaml(yaml: string): TriggerState {
  const hasPush = /(^|\n)\s*on\s*:\s*[\s\S]*?\bpush\s*:/m.test(yaml);
  const hasPR = /(^|\n)\s*on\s*:\s*[\s\S]*?\bpull_request\s*:/m.test(yaml);

  return {
    push: { enabled: hasPush, branches: extractBranches(yaml, "push") },
    pull_request: { enabled: hasPR, branches: extractBranches(yaml, "pull_request") },
  };
}

function extractBranches(yaml: string, key: "push" | "pull_request"): string[] {
  // รองรับทั้งกรณีมี/ไม่มีช่องว่าง และอยู่หลายบรรทัด
  const re = new RegExp(
    String.raw`on\s*:\s*[\s\S]*?${key}\s*:\s*[\s\S]*?branches\s*:\s*\[([^\]]*)\]`,
    "m"
  );
  const m = yaml.match(re);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

export function applyTriggersToYaml(yaml: string, t: TriggerState): string {
  const onBlock = buildOnBlock(t);
  return replaceOnBlock(yaml, onBlock);
}

function buildOnBlock(t: TriggerState): string {
  // ถ้าไม่มีอีเวนต์ไหนเปิดเลย -> on: {}
  if (!t.push.enabled && !t.pull_request.enabled) return "on: {}";

  const lines: string[] = ["on:"];

  if (t.push.enabled) {
    const b = (t.push.branches.length ? t.push.branches : ["main"]).join(", ");
    lines.push("  push:");
    lines.push(`    branches: [${b}]`);
  }
  if (t.pull_request.enabled) {
    const b = (t.pull_request.branches.length ? t.pull_request.branches : ["main"]).join(", ");
    lines.push("  pull_request:");
    lines.push(`    branches: [${b}]`);
  }

  return lines.join("\n");
}

function replaceOnBlock(yaml: string, onBlock: string): string {
  // แทนที่บล็อก on: เดิม (ไม่พึ่งพา key ถัดไป)
  const re = /^[ \t]*on\s*:\s*([\s\S]*?)(?=^[^\s]|\s*$)/m;
  if (re.test(yaml)) {
    return yaml.replace(re, onBlock + "\n");
  }
  // ถ้าไม่พบ on: ให้แทรกไว้บรรทัดแรก
  return onBlock + "\n" + yaml;
}

// ช่วยเทียบ state แบบ deep (กัน loop/กระพริบ)
export function isSameTrigger(a: TriggerState, b: TriggerState): boolean {
  const j = (x: string[]) => x.join(",");
  return (
    a.push.enabled === b.push.enabled &&
    a.pull_request.enabled === b.pull_request.enabled &&
    j(a.push.branches) === j(b.push.branches) &&
    j(a.pull_request.branches) === j(b.pull_request.branches)
  );
}
