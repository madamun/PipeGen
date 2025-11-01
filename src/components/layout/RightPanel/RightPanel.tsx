// src/components/Rightside/Rightside.tsx
"use client";

import EditorTop from "@/components/layout/RightPanel/EditorTop";
import EditorBody from "@/components/layout/RightPanel/EditorBody";

export default function Rightside() {
  return (
    <section
      className="
        flex flex-col flex-1
        rounded-[16px] shadow-[2px_4px_8px_rgba(0,0,0,0.30)]
       bg-[#02184B]
        h-[620px] max-h-screen overflow-auto
      "
    >
      {/* Top: tabs bar */}
      <div className="h-11 border-b border-white/10">
        <EditorTop />
      </div>

      {/* Body: CodeMirror (YAML) */}
      <div className="flex-1 bg-[#010819]">
        <EditorBody />
      </div>

      {/* Bottom: commit bar (เดี๋ยวค่อยต่อ action จริง) */}
      <div className=" bg-[#010819] px-3 pb-3 pt-3 flex justify-end">
        <button
          className="rounded-lg bg-[#3366ff] px-5 py-1.5 text-sm font-medium text-white hover:bg-[#274bcc] transition"
        >
          Commit
        </button>
      </div>
    </section>
  );
}
