// src/components/layout/RightPanel/RightPanel.tsx

"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  FolderOpen,
  Trash2,
  FileClock,
  Github,
} from "lucide-react";
import EditorBody from "./EditorBody";
import CommitDialog from "../../commit/CommitDialog";
import EditorToolbar from "./EditorToolbar";
import { usePipeline } from "../../workspace/PipelineProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../ui/dropdown-menu";

interface EditorHeaderProps {
  zoom: number;
  setZoom: (z: number) => void;
  isDiffMode: boolean;
  setIsDiffMode: (v: boolean) => void;
}

function EditorHeader({
  zoom,
  setZoom,
  isDiffMode,
  setIsDiffMode,
}: EditorHeaderProps) {
  // ✅ เรียก fileContent และ selectedFile มาใช้
  const {
    selectedFile,
    setSelectedFile,
    draftList,
    gitFileList,
    renameCurrentFile,
    discardDraft,
    provider,
    fileContent,
  } = usePipeline();

  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isCurrentFileDraft = React.useMemo(
    () => draftList.some((f) => f.fileName === selectedFile),
    [draftList, selectedFile],
  );

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.value) inputRef.current.select();
    }
  }, [isEditing]);

  const startRenaming = () => {
    if (provider === "gitlab") return;
    setTempName(selectedFile);
    setIsEditing(true);
  };
  const handleCreateNew = () => {
    if (provider === "gitlab") {
      renameCurrentFile(".gitlab-ci.yml");
      setIsEditing(false);
    } else {
      setSelectedFile("");
      setTempName("");
      setIsEditing(true);
    }
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
    if (!finalName.endsWith(".yml") && !finalName.endsWith(".yaml"))
      finalName += ".yml";
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
    <div className="flex h-11 px-4 pr-4 pl-[30px] justify-between items-center self-stretch border-b border-white/10 ">
      <div className="flex items-end flex-1 gap-1 h-full pb-[1px]">
        {(selectedFile || isEditing) && (
          <div className="flex items-center gap-2 px-3 py-1.5 min-w-[180px] max-w-[300px] rounded-[4px_8px_0_0] bg-[#010819] shadow-[0_-2px_4px_0_rgba(0,0,0,1)] text-slate-200 text-sm border-t border-l border-r border-white/10 relative top-[1px] h-full">
            {selectedFile && (
              <span
                className={`inline-block h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)] ${isCurrentFileDraft ? "bg-amber-600 shadow-amber-600/50" : "bg-slate-500"}`}
              />
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
                className={`truncate flex-1 ${provider === "gitlab" ? "cursor-default" : "cursor-pointer select-none"}`}
                onDoubleClick={
                  provider === "gitlab" ? undefined : startRenaming
                }
                title={selectedFile}
              >
                {selectedFile}
              </span>
            )}
            {!isEditing && (
              <>
                {" "}
                {provider !== "gitlab" && (
                  <Pencil
                    onClick={startRenaming}
                    className="h-3.5 w-3.5 text-slate-500 hover:text-blue-400 cursor-pointer transition-colors"
                  />
                )}{" "}
                {isCurrentFileDraft && (
                  <>
                    {" "}
                    {provider !== "gitlab" && (
                      <div className="w-[1px] h-3 bg-white/10 mx-1"></div>
                    )}{" "}
                    <Trash2
                      onClick={discardDraft}
                      className="h-3.5 w-3.5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                      title="Discard changes"
                    />{" "}
                  </>
                )}{" "}
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 pb-1">
          <button
            onClick={handleCreateNew}
            className="h-7 w-7 grid place-items-center rounded-md bg-white/5 hover:bg-white/10 hover:text-blue-300 transition-all text-slate-400"
          >
            <Plus className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 w-7 grid place-items-center rounded-md bg-white/5 hover:bg-white/10 hover:text-yellow-300 transition-all text-slate-400 outline-none">
              <FolderOpen className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#0f1e50] border-white/20 text-white min-w-[240px]"
            >
              {draftList.length > 0 && (
                <>
                  {" "}
                  <DropdownMenuLabel className="text-xs text-amber-400 font-normal px-2 py-1 flex items-center gap-2">
                    <FileClock className="w-3 h-3" /> Draft Files
                  </DropdownMenuLabel>{" "}
                  {draftList.map((f) => (
                    <DropdownMenuItem
                      key={f.fullPath}
                      onClick={() => setSelectedFile(f.fileName)}
                      className="cursor-pointer hover:bg-white/10 pl-6 focus:bg-white/10 focus:text-white"
                    >
                      <span className="text-amber-200">{f.fileName}</span>{" "}
                      <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 px-1.5 rounded">
                        Draft
                      </span>
                    </DropdownMenuItem>
                  ))}{" "}
                  <DropdownMenuSeparator className="bg-white/10" />{" "}
                </>
              )}
              <DropdownMenuLabel className="text-xs text-slate-400 font-normal px-2 py-1 flex items-center gap-2">
                <Github className="w-3 h-3" /> Repository Files
              </DropdownMenuLabel>
              {gitFileList.length === 0 ? (
                <div className="px-6 py-2 text-xs text-slate-500 italic">
                  No other files found
                </div>
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

      <div className="flex items-center">
        {/* ✅ ส่ง fileName ไปให้ Toolbar */}
        <EditorToolbar
          content={fileContent}
          fileName={selectedFile}
          zoom={zoom}
          setZoom={setZoom}
          isDiffMode={isDiffMode}
          setIsDiffMode={setIsDiffMode}
        />
      </div>
    </div>
  );
}

export default function RightPanel() {
  const [fontSize, setFontSize] = React.useState(13);
  const [isDiffMode, setIsDiffMode] = React.useState(false);

  return (
    <section className="flex flex-col flex-1 rounded-[16px] shadow-[2px_4px_8px_rgba(0,0,0,0.30)] bg-[#02184B] h-[595px] max-h-screen overflow-hidden relative z-0">
      <EditorHeader
        zoom={fontSize}
        setZoom={setFontSize}
        isDiffMode={isDiffMode}
        setIsDiffMode={setIsDiffMode}
      />
      <div className="flex-1 bg-[#010819] overflow-auto relative">
        <EditorBody fontSize={fontSize} isDiffMode={isDiffMode} />
      </div>
      <div className="bg-[#010819] px-3 pb-3 pt-3 flex justify-end border-t border-white/5">
        <CommitDialog />
      </div>
    </section>
  );
}
