// src/components/layout/RightPanel/RightPanel.tsx
"use client";

import * as React from "react";
import { Plus, Pencil, FolderOpen, Trash2 } from "lucide-react"; // 1. ✅ เพิ่ม Trash2
import { FileClock, Github } from "lucide-react";
import EditorBody from "./EditorBody";
import CommitDialog from "@/components/commit/CommitDialog";
import { usePipeline } from "@/components/workspace/PipelineProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// --- ส่วนย่อย: Header ---
function EditorHeader() {
  // 2. ✅ เพิ่ม discardDraft เข้ามา
  const { selectedFile, setSelectedFile, draftList, gitFileList, renameCurrentFile, discardDraft } = usePipeline();

  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 3. ✅ เช็คว่าไฟล์ปัจจุบันเป็น Draft หรือไม่? (ถ้าใช่ ถึงจะโชว์ปุ่มลบ)
  const isCurrentFileDraft = React.useMemo(() => {
    return draftList.some(f => f.fileName === selectedFile);
  }, [draftList, selectedFile]);

  // Focus Input ทันทีที่เข้าโหมด Edit
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.value) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const startRenaming = () => {
    setTempName(selectedFile); 
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setSelectedFile("");
    setTempName(""); 
    setIsEditing(true);
  };

  const saveName = () => {
    let finalName = tempName.trim();
    if (!finalName) {
      if (!selectedFile) {
        setIsEditing(false);
        return;
      }
      finalName = selectedFile;
    }
    if (!finalName.endsWith(".yml") && !finalName.endsWith(".yaml")) {
      finalName += ".yml";
    }
    renameCurrentFile(finalName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveName();
    if (e.key === "Escape") {
      setIsEditing(false);
      if (!selectedFile) setSelectedFile("");
    }
  };

  return (
    <div className="flex h-11 px-4 pr-0 pl-[30px] justify-between items-end self-stretch border-b border-white/10">
      <div className="flex items-end flex-1 gap-1">

        {(selectedFile || isEditing) && (
          <div
            className="
              flex items-center gap-2 px-3 py-1.5 min-w-[180px] max-w-[300px]
              rounded-[4px_8px_0_0] 
              bg-[#010819] 
              shadow-[0_-2px_4px_0_rgba(0,0,0,1)]
              text-slate-200 text-sm border-t border-l border-r border-white/10 relative top-[1px]
            "
          >
            {selectedFile && (
              <span className={`inline-block h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)] ${isCurrentFileDraft ? "bg-amber-600 shadow-amber-600/50" : "bg-slate-500"}`} />
            )}

            {isEditing ? (
              <input
                ref={inputRef}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={saveName}
                onKeyDown={handleKeyDown}
                placeholder="Type filename..."
                className="bg-transparent text-white border-b border-blue-500 outline-none w-full h-5 text-sm leading-none placeholder:text-slate-600"
              />
            ) : (
              <span
                className="truncate cursor-pointer select-none flex-1"
                onDoubleClick={startRenaming}
                title={selectedFile}
              >
                {selectedFile}
              </span>
            )}

            {!isEditing && (
                <>
                  {/* ปุ่มดินสอ (Rename) */}
                  <Pencil
                    onClick={startRenaming}
                    className="h-3.5 w-3.5 text-slate-500 hover:text-blue-400 cursor-pointer transition-colors"
                  />
                  
                  {/* 4. ✅ ปุ่มถังขยะ (Discard) - โชว์เฉพาะตอนเป็น Draft */}
                  {isCurrentFileDraft && (
                      <div className="w-[1px] h-3 bg-white/10 mx-1"></div> // เส้นคั่นบางๆ
                  )}
                  
                  {isCurrentFileDraft && (
                      <Trash2 
                        onClick={discardDraft}
                        className="h-3.5 w-3.5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                        title="Discard changes (Revert)"
                      />
                  )}
                </>
            )}

          </div>
        )}

        {/* ปุ่มสร้างไฟล์ใหม่ (+) */}
        <div className="flex items-center pb-1">
          <button
            onClick={handleCreateNew}
            className="h-7 w-7 grid place-items-center rounded-md bg-white/5 hover:bg-white/10 hover:text-blue-300 transition-all text-slate-400"
            title="Create new pipeline file"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* ปุ่มเลือกไฟล์เก่า (Dropdown) */}
        <div className="flex items-center pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-7 w-7 grid place-items-center rounded-md bg-white/5 hover:bg-white/10 hover:text-yellow-300 transition-all text-slate-400"
                title="Open existing file"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#0f1e50] border-white/20 text-white min-w-[240px]">
              
              {/* Drafts */}
              {draftList.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-amber-400 font-normal px-2 py-1 flex items-center gap-2">
                    <FileClock className="w-3 h-3" />
                    Draft Files
                  </DropdownMenuLabel>
                  {draftList.map((f) => (
                    <DropdownMenuItem
                      key={f.fullPath}
                      onClick={() => setSelectedFile(f.fileName)}
                      className="cursor-pointer hover:bg-white/10 pl-6 focus:bg-white/10 focus:text-white"
                    >
                      <span className="text-amber-200">{f.fileName}</span>
                      <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 rounded">Draft</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}

              {/* Git Files */}
              <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-2 py-1 flex items-center gap-2">
                <Github className="w-3 h-3" />
                Repository Files
              </DropdownMenuLabel>
              {gitFileList.length === 0 ? (
                <div className="px-6 py-2 text-xs text-slate-500 italic">No other files found</div>
              ) : (
                gitFileList.map((f) => (
                  <DropdownMenuItem
                    key={f.fullPath}
                    onClick={() => setSelectedFile(f.fileName)}
                    className="cursor-pointer hover:bg-white/10 pl-6 focus:bg-white/10 focus:text-white"
                  >
                    {f.fileName}
                  </DropdownMenuItem>
                ))
              )}

            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </div>
  );
}

export default function RightPanel() {
  return (
    <section className="flex flex-col flex-1 rounded-[16px] shadow-[2px_4px_8px_rgba(0,0,0,0.30)] bg-[#02184B] h-[595px] max-h-screen overflow-hidden relative z-0">
      <EditorHeader />
      <div className="flex-1 bg-[#010819] overflow-auto relative">
        <EditorBody />
      </div>
      <div className="bg-[#010819] px-3 pb-3 pt-3 flex justify-end border-t border-white/5">
        <CommitDialog />
      </div>
    </section>
  );
}