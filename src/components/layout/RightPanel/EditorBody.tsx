"use client";

import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap, EditorView } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { usePipeline } from "@/components/workspace/PipelineProvider";

export default function EditorBody() {
  const { yaml, setYaml } = usePipeline();

  // เก็บสำเนาใน local เพื่อลดการ re-render และไม่ให้เคอร์เซอร์กระโดด
  const [doc, setDoc] = React.useState(yaml);

  // ถ้า yaml จาก context เปลี่ยน (กดสวิตช์/ปุ่มฝั่งซ้าย)
  // ค่อย sync เข้ามาเฉพาะตอน content ต่างจริง ๆ
  React.useEffect(() => {
    if (yaml !== doc) setDoc(yaml);
  }, [yaml, doc]);

  // debounce การอัปเดต context (กันยิง setYaml ถี่เกิน)
  const t = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateUpstream = React.useCallback((next: string) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setYaml(next), 120);
  }, [setYaml]);

  return (
    <div className="h-full w-full">
      <CodeMirror
        value={doc}
        height="calc(90vh - 220px)" // ปรับตาม layout
        theme={oneDark}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true,
          autocompletion: true,
        }}
        extensions={[
          yamlLang(),
          keymap.of([
            indentWithTab,
            {
              key: "Mod-s",
              preventDefault: true,
              run: () => {
                // ตรงนี้จะเป็น future: save ฯลฯ
                return true;
              },
            },
          ]),
          EditorView.lineWrapping, // พับบรรทัดอัตโนมัติ
        ]}
        onChange={(next) => {
          // อัปเดตจอทันที + ค่อยยิงขึ้น context แบบ debounce
          setDoc(next);
          updateUpstream(next);
        }}
        // ปิดแสงขอบ Editor
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 14, borderRadius: 12, overflow: "hidden" }}
      />
    </div>
  );
}
