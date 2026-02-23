"use client";

import { Button } from "../../ui/button";
import { Sparkles, Loader2 } from "lucide-react"; // ใช้ Sparkles (วิ้งๆ) และ Loader2 (หมุนๆ)
import { usePipeline } from "../../workspace/PipelineProvider"; // 👈 ตรวจสอบ path ให้ตรงกับไฟล์ของคุณ

export default function TopbarActions() {
  // ดึง autoSetup และสถานะ isLoading มาจาก Context
  const { autoSetup, isLoading } = usePipeline();

  return (
    <div className="flex h-9 items-center gap-3">
      <Button
        onClick={autoSetup}
        disabled={isLoading} // 🔒 ปิดปุ่มตอนกำลังสแกน กันคนกดซ้ำ
        className="h-9 rounded-xl bg-[#07003f] text-white hover:bg-zinc-700 transition-all"
      >
        {isLoading ? (
          <>
            {/* แสดง Icon หมุนๆ ตอนโหลด */}
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scanning Repo...
          </>
        ) : (
          <>
            {/* แสดง Icon วิ้งๆ ตอนปกติ */}
            <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
            Auto Setup
          </>
        )}
      </Button>

    </div>
  );
}
