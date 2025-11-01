"use client";

import { Button } from "@/components/ui/button";
import { Gitlab  } from "lucide-react";

export default function TopbarActions() {
  const handleAutoSetup = () => console.log("Auto Setup");
  const handleSecurityScan = () => console.log("Security Scan");

  return (
    <div className="flex h-9 items-center gap-3">
      <Button
        
        onClick={handleAutoSetup}
        className="h-9 rounded-xl bg-[#07003f] text-white  hover:bg-zinc-700"
      >
        <Gitlab className="mr-2 h-4 w-4" />
        Auto Setup
      </Button>

      {/* <Button
        onClick={handleSecurityScan}
        className="h-9 rounded-xl bg-[#07003f] text-white hover:bg-zinc-700"
      >
        <Shield className="mr-2 h-4 w-4" />
        Security Scan
      </Button> */}
    </div>
  );
}
