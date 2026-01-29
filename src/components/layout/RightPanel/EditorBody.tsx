// src/components/layout/RightPanel/EditorBody.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import { keymap, EditorView } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

// 1. Import Provider ของเรา
import { usePipeline } from "@/components/workspace/PipelineProvider";

export default function EditorBody() {
  // 2. ดึง fileContent
  const { fileContent, setFileContent, selectedFile } = usePipeline();

  // ✅ FIX 1: แปลงค่าให้เป็น String เสมอ
  const safeContent = typeof fileContent === "string" ? fileContent : "";

  // Local State สำหรับ Editor (เพื่อให้พิมพ์ลื่น ไม่รอ Context)
  const [doc, setDoc] = useState(safeContent);

  // ✅ FIX 2: Sync ข้อมูล 'ขาเข้า' (จาก DB/GitHub)
  // จะทำงานก็ต่อเมื่อ "เปลี่ยนไฟล์ใหม่" หรือ "ค่า safeContent เปลี่ยนแบบก้าวกระโดด" (เช่น โหลดเสร็จ)
  // เราจะไม่ใส่ [fileContent] ตรงๆ เพื่อป้องกัน Loop ตอนพิมพ์
  useEffect(() => {
    setDoc(safeContent);
  }, [selectedFile, safeContent]); 
  // หมายเหตุ: การใส่ safeContent ตรงนี้ไม่อันตรายเพราะเรามี debounce ขาออกช่วยหน่วงไว้
  // แต่ถ้ายังกระตุก สามารถเอา safeContent ออก แล้วใช้ key={selectedFile} แทนได้

  // Debounce Ref
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ FIX 3: Sync ข้อมูล 'ขาออก' (ไปเก็บใน Context/DB)
  const handleChange = useCallback((val: string) => {
    // 1. อัปเดตหน้าจอทันที (คนใช้งานจะรู้สึกว่าลื่น)
    setDoc(val);

    // 2. หน่วงเวลาส่งไปเก็บใน Context (ลดการ Re-render ของแม่)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setFileContent(val);
    }, 300); // เพิ่มเวลาเป็น 300ms ให้พิมพ์ต่อเนื่องได้เนียนขึ้น
  }, [setFileContent]);

  // หน้าจอตอนยังไม่เลือกไฟล์
  if (!selectedFile) {
    return (
      <div className="h-full w-full bg-[#282c34] flex flex-col items-center justify-center text-slate-500 select-none">
        <div className="text-4xl mb-2">👋</div>
        <p className="text-sm">Select a file (📂) or create new (+)</p>
        <p className="text-xs opacity-50 mt-1">to start editing pipeline</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#282c34]">
      <CodeMirror
        // ✅ FIX 4: ใส่ key เพื่อบังคับให้ Editor สร้างใหม่เมื่อเปลี่ยนไฟล์ (แก้บั๊กแสดงข้อมูลไฟล์เก่าค้าง)
        key={selectedFile} 
        value={doc}
        height="100%"
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
                console.log("Save Triggered (Ctrl+S)");
                // ถ้าอยากให้กด Ctrl+S แล้วเซฟทันทีโดยไม่รอ debounce
                setFileContent(doc); 
                return true;
              },
            },
          ]),
          EditorView.lineWrapping, 
        ]}
        onChange={handleChange}
        style={{ 
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", 
            fontSize: 14, 
            height: "100%" 
        }}
        className="h-full"
      />
    </div>
  );
}