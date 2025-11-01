export type Triggers = { push: boolean; pull_request: boolean };

export function applyTriggersToYaml(yaml: string, t: Triggers): string {
  const b = (v: boolean) => (v ? "true" : "false");

  if (!/^\s*on\s*:/m.test(yaml)) {
    const block = ["on:", `  push: ${b(t.push)}`, `  pull_request: ${b(t.pull_request)}`].join("\n");
    return yaml ? `${block}\n${yaml}` : block;
  }

  const lines = yaml.split(/\r?\n/);
  const iOn = lines.findIndex((l) => /^\s*on\s*:\s*$/.test(l));
  if (iOn === -1) return yaml;

  // ขอบเขตของบล็อก on:
  let end = lines.length;
  for (let i = iOn + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) { end = i; break; }
  }
  const indent = "  ";

  const upsert = (key: "push" | "pull_request", val: string) => {
    const r = new RegExp(`^\\s*${key}\\s*:`);
    const idx = lines.findIndex((l, j) => j > iOn && j < end && r.test(l));
    const newLine = `${indent}${key}: ${val}`;
    if (idx !== -1) lines[idx] = newLine;
    else { lines.splice(iOn + 1, 0, newLine); end++; }
  };

  upsert("push", b(t.push));
  upsert("pull_request", b(t.pull_request));
  return lines.join("\n");
}
