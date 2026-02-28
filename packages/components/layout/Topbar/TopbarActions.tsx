"use client";

import { Button } from "../../ui/button";
import { Sparkles, Loader2 } from "lucide-react"; // ใช้ Sparkles (วิ้งๆ) และ Loader2 (หมุนๆ)
import { usePipeline } from "../../workspace/PipelineProvider"; // 👈 ตรวจสอบ path ให้ตรงกับไฟล์ของคุณ

export default function TopbarActions() {
  // ดึง autoSetup และสถานะ isLoading มาจาก Context
  const { autoSetup, isAnalyzing } = usePipeline();

  return (
    <div className="flex h-9 items-center gap-3">
      <Button
        onClick={autoSetup}
        disabled={isAnalyzing} // 🔒 ปิดปุ่มตอนกำลังสแกน กันคนกดซ้ำ
        className="h-9 rounded-xl bg-[#07003f] text-white hover:bg-[#170b67] transition-all"
      >
        {isAnalyzing ? (
          <>
            {/* แสดง Icon หมุนๆ ตอนโหลด */}
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing repository...
          </>
        ) : (
          <>
            {/* แสดง Icon วิ้งๆ ตอนปกติ */}
            <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
            Auto Setup
          </>
        )}
      </Button>

      {/* <Button
        onClick={handleSecurityScan}
        className="h-9 rounded-xl bg-[#3b82f6] text-white hover:bg-[#2f6ad6]"
      >
        <Shield className="mr-2 h-4 w-4" />
        Security Scan
      </Button> */}
    </div>
  );
}
