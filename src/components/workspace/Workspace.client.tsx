"use client";
import LeftPanel from "@/components/layout/LeftPanel/LeftPanel";
import RightPanel from "@/components/layout/RightPanel/RightPanel";
import { PipelineProvider } from "@/components/workspace/PipelineProvider";

export default function Workspace() {
  return (
    <PipelineProvider>
      <div className="grid grid-cols-1 lg:grid-cols-[580px_1fr] gap-6">
        <LeftPanel />
        <RightPanel />
      </div>
    </PipelineProvider>
  );
}
