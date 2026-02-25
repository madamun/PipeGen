"use client";
import LeftPanel from "../layout/LeftPanel/LeftPanel";
import RightPanel from "../layout/RightPanel/RightPanel";
import { usePipeline } from "../workspace/PipelineProvider";

export default function Workspace() {
  const { isCollapsed } = usePipeline();

  return (
    <div
      className={`grid gap-6 min-h-[calc(100dvh-128px)] h-[calc(100dvh-128px)] overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${
        isCollapsed
          ? "grid-cols-[80px_1fr]"
          : "grid-cols-1 lg:grid-cols-[580px_1fr]"
      }`}
    >
      <div className="min-h-0 h-full overflow-hidden">
        <LeftPanel />
      </div>

      <div className="min-h-0 h-full overflow-hidden">
        <RightPanel />
      </div>
    </div>
  );
}
