// packages/components/layout/LeftPanel/LeftPanel.tsx
"use client";

import { useState } from "react";
import {
  ArrowLeftToLine,
  ChevronsUpDown,
  ArrowRightToLine,
  Search,
} from "lucide-react";
import SetupSection from "./Setup/SetupSection";
import { usePipeline } from "../../workspace/PipelineProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";

// --- ส่วนย่อย: Top Header ---
function LeftTop({
  onToggleAll,
  isCollapsed,
  setIsCollapsed,
  searchQuery,
  setSearchQuery,
}: {
  onToggleAll: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  return (
    // ✅ นำ TooltipProvider มาครอบส่วน Header เพื่อให้ Tooltip ทำงานได้
    <TooltipProvider delayDuration={200}>
      <div
        className={`flex h-11 items-center gap-6 px-4 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "w-full"}`}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Expand Panel" : "Collapse Panel"}
              className="text-white/70 hover:text-white transition-colors flex shrink-0 items-center justify-center w-8 h-8 rounded-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {isCollapsed ? (
                <ArrowRightToLine className="h-4 w-4" />
              ) : (
                <ArrowLeftToLine className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
          >
            {isCollapsed ? "Expand Panel" : "Collapse Panel"}
          </TooltipContent>
        </Tooltip>

        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-7 pr-2 rounded-md bg-white/5 border border-white/10 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleAll}
                  aria-label="Expand or collapse all categories"
                  className="text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-[#111d35] text-slate-200 border-white/20 text-[11px] px-2 py-2 mt-1 leading-none font-medium tracking-wide"
              >
                Expand / Collapse All
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

// --- Component หลัก ---
export default function LeftPanel() {
  const {
    categories,
    categoriesOpen,
    setCategoriesOpen,
    sectionsOpen,
    setSectionsOpen,
    isCollapsed,
    setIsCollapsed,
  } = usePipeline();
  const [searchQuery, setSearchQuery] = useState("");

  // ฟังก์ชันฉลาดๆ สำหรับเปิด/ปิดทั้งหมด
  const toggleAllCategories = () => {
    const isAnyOpen = Object.values(categoriesOpen).some(
      (isOpen) => isOpen === true,
    );
    const nextState: Record<string, boolean> = {};

    categories.forEach((cat) => {
      nextState[cat.id] = !isAnyOpen;
    });

    setCategoriesOpen(nextState);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header ✅ ส่ง Props ลงไปให้ Header */}
      <LeftTop
        onToggleAll={toggleAllCategories}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* เส้นคั่นสีฟ้าสดใส */}
      <div className="flex w-full items-start px-2 py-2 shrink-0">
        <div className="h-px w-full bg-[#5184FB]" />
      </div>

      {/* พื้นที่เนื้อหา SetupSection */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-10">
        {/* ✅ ส่ง State หมวดหมู่ และ สถานะการยุบจอ ลงไปให้ SetupSection จัดการต่อ */}
        <SetupSection
          categoriesOpen={categoriesOpen}
          setCategoriesOpen={setCategoriesOpen}
          sectionsOpen={sectionsOpen}
          setSectionsOpen={setSectionsOpen}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}