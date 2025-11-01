"use client";

import Top from "@/components/layout/LeftPanel/Top";
import SetupBlock from "@/components/layout/LeftPanel/Setup/SetupBlock";
import SetupContent from "@/components/layout/LeftPanel/Setup/SetupContent";

export default function LeftPanel() {
  return (
    <div className="min-h-screen text-white">
      <aside className="w-full max-w-[584px]">
        <Top />
        <div className="flex w-full items-start px-2 py-2">
          <div className="h-px w-full bg-[#5184FB]" />
        </div>
        <SetupBlock>
          <SetupContent />
        </SetupBlock>
      </aside>
    </div>
  );
}

