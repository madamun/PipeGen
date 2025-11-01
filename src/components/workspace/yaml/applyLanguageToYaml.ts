export function readLanguageFromYaml(yaml: string): string {
  const m = yaml.match(/^\s*language\s*:\s*([^\n#]+)/m);
  return (m?.[1]?.trim() ?? "");
}

// แก้/เพิ่มบรรทัด language: <val> โดยไม่ยุ่งอย่างอื่น
export function applyLanguageToYaml(yaml: string, lang: string): string {
  if (!lang) return yaml;

  if (/^\s*language\s*:/m.test(yaml)) {
    // replace บรรทัด language เดิม
    return yaml.replace(/^\s*language\s*:\s*[^\n#]+/m, `language: ${lang}`);
  }

  // ถ้าไม่มี language: ให้แทรกหลังบล็อก on: ถ้ามี ไม่งั้นใส่บรรทัดแรก
  const lines = yaml.split(/\r?\n/);
  const iOn = lines.findIndex((l) => /^\s*on\s*:\s*$/.test(l));
  if (iOn !== -1) {
    // หาตำแหน่งจบบล็อก on:
    let end = lines.length;
    for (let i = iOn + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) { end = i; break; }
    }
    lines.splice(end, 0, `language: ${lang}`);
    return lines.join("\n");
  }
  return [`language: ${lang}`, yaml].filter(Boolean).join("\n");
}
