"use client";

import { useState } from "react"; // ✅ เพิ่ม useState
import {
  ArrowLeftToLine,
  ChevronsUpDown,
  ArrowRightToLine,
  Github,
  Gitlab,
} from "lucide-react";
// ⚠️ แก้ path SearchBar ให้ตรงกับที่คุณเก็บไว้นะครับ
import SearchBar from "../../common/SearchBar";
import SetupSection from "./Setup/SetupSection";
import { usePipeline } from "../../workspace/PipelineProvider";

// --- ส่วนย่อย: Top Header ---
// ✅ รับ Props onToggleAll เข้ามาเพื่อเอาไปผูกกับปุ่ม
function LeftTop({
  onToggleAll,
  isCollapsed,
  setIsCollapsed,
}: {
  onToggleAll: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}) {
  return (
    <div
      className={`flex h-11 items-center px-5 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : "justify-between w-full"}`}
    >
      {/* ปุ่มซ้าย */}
      {/* 🔥 ปุ่มลูกศร (กดแล้วสลับสถานะ ยุบ <-> ขยาย) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="text-white/70 hover:text-white transition-colors flex shrink-0 items-center justify-center w-8 h-8 rounded-md hover:bg-white/10"
        title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
      >
        {isCollapsed ? (
          <ArrowRightToLine className="h-4 w-4" />
        ) : (
          <ArrowLeftToLine className="h-4 w-4" />
        )}
      </button>

      {/* 🔥 ถ้าจอยัง "กางอยู่" ถึงจะแสดง Search กับปุ่ม ขยายทั้งหมด */}
      {!isCollapsed && (
        <>
          <div className="flex flex-1 justify-center px-4">
            <div className="w-full max-w-[320px]">
              <SearchBar />
            </div>
          </div>
          <button
            onClick={onToggleAll}
            className="text-white/70 hover:text-white transition-colors shrink-0"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

// --- Component หลัก ---
// ✅ 3. รับ Props จากหน้า Workspace
export default function LeftPanel({
  isCollapsed = false,
  setIsCollapsed = () => {},
}: {
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
}) {
  const { provider, setProvider, categories } = usePipeline();

  // State การเปิด-ปิดหมวดหมู่หลัก (Lifting State Up)
  const [categoriesOpen, setCategoriesOpen] = useState<Record<string, boolean>>(
    {},
  );

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
    <div className="ml-3 flex flex-col h-full">
      {/* Header ✅ ส่ง Props ลงไปให้ Header */}
      <LeftTop
        onToggleAll={toggleAllCategories}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
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
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </div>
    </div>
  );
}
