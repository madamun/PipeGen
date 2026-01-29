"use client";

import { ArrowLeftToLine, ChevronsUpDown } from "lucide-react";
// ⚠️ แก้ path SearchBar ให้ตรงกับที่คุณเก็บไว้นะครับ
import SearchBar from "@/components/common/SearchBar"; 
import SetupSection from "./Setup/SetupSection";

// --- ส่วนย่อย: Top Header (แบบเดิม) ---
function LeftTop() {
  return (
    <div className="flex h-11 items-center justify-between px-5 w-[552px] ">
      {/* ปุ่มซ้าย */}
      <button className="text-white/70 hover:text-white transition-colors">
        <ArrowLeftToLine className="h-4 w-4" />
      </button>

      {/* Search กลาง */}
      <div className="flex flex-1 justify-center px-4">
        <div className="w-full max-w-[320px]">
          <SearchBar />
        </div>
      </div>

      {/* ปุ่มขวา */}
      <button className="text-white/70 hover:text-white transition-colors">
        <ChevronsUpDown className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Component หลัก ---
export default function LeftPanel() {
  return (
    <div className="ml-3">
      
      {/* Header */}
      <LeftTop />
      
      {/* เส้นคั่นสีฟ้าสดใส */}
      <div className="flex w-full items-start px-2 py-2 shrink-0">
        <div className="h-px w-full bg-[#5184FB]" />
      </div>

      {/* พื้นที่เนื้อหา SetupSection (มี Scrollbar ถ้าเนื้อหายาว) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-10">
         <SetupSection />
      </div>

    </div>
  );
}