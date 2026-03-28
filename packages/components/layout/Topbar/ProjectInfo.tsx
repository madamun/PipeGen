// src/components/layout/Topbar/ProjectInfo.tsx
"use client";

import RepoPicker from "../../repo/RepoPicker";
import BranchPicker from "../../repo/BranchPicker";
import { usePipeline } from "../../workspace/PipelineProvider";
import { ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";

// Repo + Branch ในหนึ่งแถว (Context bar)
export default function ProjectInfo() {
  const { selectedRepo } = usePipeline();
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-row items-center gap-3">
        
        {/* สลับเลเยอร์: เอา Tooltip มาครอบ RepoPicker แทน */}
        <Tooltip>
          <TooltipTrigger asChild>
            {/* ครอบ div ไว้ 1 ชั้น เพื่อให้ Tooltip รับแค่ Hover แล้วปล่อยให้ Click ทะลุไปหา RepoPicker */}
            <div>
              <RepoPicker>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md px-1 py-1 -ml-3 text-left hover:bg-white/10 transition-colors group max-w-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#02184B]"
                  aria-label="Select repository"
                >
                  <span className={`min-w-0 px-2 truncate text-base font-semibold group-hover:text-white
                    ${!selectedRepo ? "text-white animate-pulse" : "text-white"}`}>
                    {selectedRepo?.name ?? "Select a repository"}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 group-hover:text-white mt-1
                    ${!selectedRepo ? "text-white animate-pulse" : "text-slate-300"}`} />
                </button>
              </RepoPicker>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
          >
            {selectedRepo?.full_name ?? "Click to select a repository"}
          </TooltipContent>
        </Tooltip>
        
        <span className="text-white/30">|</span>
        <span className="text-slate-400 text-sm shrink-0">Branch:</span>
        
        {selectedRepo ? (
          <BranchPicker />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-slate-500 text-sm italic cursor-default">
                Select a repository first
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
            >
              Please select a repository
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}