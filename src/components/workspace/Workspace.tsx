// src/app/workspace/page.tsx (หรือไฟล์ Workspace ของคุณ)

"use client";
import { useState } from "react";
import LeftPanel from "@/components/layout/LeftPanel/LeftPanel";
import RightPanel from "@/components/layout/RightPanel/RightPanel";

export default function Workspace() {

  // 🔥 1. สร้าง State ไว้ควบคุมการยืด/หด
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (

    <div
      className={`grid gap-6 h-[calc(100vh-136px)] overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${isCollapsed ? "grid-cols-[80px_1fr]" : "grid-cols-1 lg:grid-cols-[580px_1fr]"
        }`}
    >

      {/* 🔥 ซ้าย: ครอบ LeftPanel ไว้ และส่ง isCollapsed ไปบอกมันด้วยว่า "ตอนนี้หดอยู่นะ" */}
      <div className="h-full overflow-hidden">
        <LeftPanel isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* 🔥 ขวา: เก็บ mr-5 ของคุณไว้เหมือนเดิม พอกล่องแม่เปลี่ยนขนาด กล่องนี้จะขยายตามเองอัตโนมัติ! */}
      <div className="h-full overflow-hidden mr-5">
        <RightPanel />
      </div>

    </div>

  );
}