"use client";
import { useState } from "react";
import LeftPanel from "../layout/LeftPanel/LeftPanel";
import RightPanel from "../layout/RightPanel/RightPanel";

export default function Workspace() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`grid gap-6 h-[calc(100vh-128px)] overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${
        isCollapsed
          ? "grid-cols-[80px_1fr]"
          : "grid-cols-1 lg:grid-cols-[580px_1fr]"
      }`}
    >
      <div className="h-full overflow-hidden">
        <LeftPanel isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <div className="h-full overflow-hidden">
        <RightPanel />
      </div>
    </div>
  );
}
