// src/components/layout/RightPanel/EditorToolbar.tsx

"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Minus,
  Plus,
  SplitSquareHorizontal,
  FileCode,
  Share,
  Download,
  Printer,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../ui/dropdown-menu";
// ✅ 1. Import Tooltip จาก Shadcn
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";

interface EditorToolbarProps {
  content: string;
  fileName: string;
  zoom: number;
  setZoom: (z: number) => void;
  isDiffMode: boolean;
  setIsDiffMode: (v: boolean) => void;
}

export default function EditorToolbar({
  content,
  fileName,
  zoom,
  setZoom,
  isDiffMode,
  setIsDiffMode,
}: EditorToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadYml = () => {
    try {
      const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "pipeline.yml";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>${fileName || "pipeline"}</title>
        <style>body { font-family: 'Courier New', monospace; padding: 20px; white-space: pre-wrap; font-size: 12px; color: #000; }</style>
        </head><body>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const BASE_PIXEL = 13;
  const currentPercent = Math.round((zoom / BASE_PIXEL) * 100);

  const handleZoom = (direction: "in" | "out") => {
    let snapPercent = Math.round(currentPercent / 10) * 10;
    let newPercent = direction === "in" ? snapPercent + 10 : snapPercent - 10;
    newPercent = Math.max(50, Math.min(newPercent, 200));
    setZoom((newPercent / 100) * BASE_PIXEL);
  };

  return (
    // ✅ 2. เอา TooltipProvider มาครอบ (delayDuration=200 คือเอาเมาส์ชี้ 0.2 วิแล้วเด้งเลย)
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        {/* 🟢 กลุ่มที่ 1: Zoom Only */}
        <div className="flex items-center bg-[#010819] border border-white/20 rounded-lg overflow-hidden h-8 shadow-sm select-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleZoom("out")}
                className="px-2 h-full text-slate-400 hover:text-white hover:bg-white/5 transition flex items-center justify-center border-r border-white/10 outline-none"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#0f1e50] text-slate-200 border-white/20 text-[10px] px-2 py-1 leading-none font-medium tracking-wide"
            >
              Zoom Out
            </TooltipContent>
          </Tooltip>

          <span className="w-[50px] text-center text-xs font-mono text-slate-200 select-none cursor-default">
            {currentPercent}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleZoom("in")}
                className="px-2 h-full text-slate-400 hover:text-white hover:bg-white/5 transition flex items-center justify-center border-l border-white/10 outline-none"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#0f1e50] text-slate-200 border-white/20 text-[10px] px-2 py-1 leading-none font-medium tracking-wide"
            >
              Zoom In
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 🔵 กลุ่มที่ 2: Tools (Diff | Copy | Export) */}
        <div className="flex items-center bg-[#010819] border border-white/20 rounded-lg overflow-hidden h-8 shadow-sm select-none">
          {/* Diff Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsDiffMode(!isDiffMode)}
                className={`flex items-center gap-2 px-3 h-full transition-all border-r border-white/10 outline-none ${isDiffMode ? "text-blue-300 bg-blue-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                {isDiffMode ? (
                  <FileCode className="w-4 h-4" />
                ) : (
                  <SplitSquareHorizontal className="w-4 h-4" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider">
                  {isDiffMode ? "Edit" : "Diff"}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#0f1e50] text-slate-200 border-white/20 text-[10px] px-2 py-1 leading-none font-medium tracking-wide"
            >
              {isDiffMode ? "Switch to Editor Mode" : "View Code Differences"}
            </TooltipContent>
          </Tooltip>

          {/* Copy Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className="px-3 h-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center border-r border-white/10 outline-none"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-[#0f1e50] text-slate-200 border-white/20 text-[10px] px-2 py-1 leading-none font-medium tracking-wide"
            >
              {copied ? "Copied to clipboard!" : "Copy Code"}
            </TooltipContent>
          </Tooltip>

          {/* Export Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger className="h-full px-3 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition outline-none">
                  <Share className="w-4 h-4" />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-[#0f1e50] text-slate-200 border-white/20 text-[10px] px-2 py-1 leading-none font-medium tracking-wide"
              >
                Export Options
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="bg-[#0f1e50] text-slate-200 border-white/20 text-[10px] px-2 py-1 leading-none font-medium tracking-wide"
            >
              <DropdownMenuLabel className="text-xs text-slate-400">
                Export As...
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleDownloadYml}
                className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Download YAML</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handlePrintPdf}
                className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white gap-2 text-xs"
              >
                <Printer className="w-3.5 h-3.5 text-red-400" />
                <span>Print / Save PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
