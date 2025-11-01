"use client";

import { useState } from "react";
import SetupHeader from "./SetupHeader";
import SetupBody from "./SetupBody";

export default function SetupBlock({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-[680px] space-y-1">
      <SetupHeader open={open} onToggle={() => setOpen((v) => !v)} />

      {/* พับ/กางแบบ smooth แต่ไม่ใช่หน้าตา dropdown */}
      <div
        className={`
          grid transition-[grid-template-rows] duration-300
          ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
        `}
      >
        <div className="overflow-hidden">
          <SetupBody>{children}</SetupBody>
        </div>
      </div>
    </div>
  );
}
