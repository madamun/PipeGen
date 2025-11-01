"use client";

import { Plus } from "lucide-react";
import { Pencil } from 'lucide-react';

export default function EditorTop() {
  return (
    <div
      className="
        flex h-11 
        px-4 pr-0 pl-[30px]  
        justify-between items-end self-stretch
        
      "
    >
      {/* Left side: mainTab + sideTab */}
      <div className="flex items-end flex-1">
        {/* mainTab */}
        <div
          className="
            flex items-center gap-2 px-2 py-1
            rounded-[4px_8px_0_0] 
            bg-[#010819] 
            shadow-[0_-2px_4px_0_rgba(0,0,0,1)]
            text-slate-200 text-sm
          "
        >
          <span className="inline-block h-1 w-1 rounded-full bg-amber-600" />
          <span>Deployment-CICD</span>
            <Pencil className="h-3 w-3 text-slate-400 hover:text-slate-200 cursor-pointer" />
        </div>

        {/* sideTab */}
        <div className="ml-1 flex items-center">
          {/* <div
            className="
              flex items-center gap-2 px-2 py-0.5
              rounded-[4px_4px_0_0]
              bg-[#03277C] 
              text-slate-200 text-sm
            "
          >
            Deployment-CICD
          </div>

          <div
            className="
              ml-1 flex items-center gap-2 px-2 py-0.5
              rounded-[4px_4px_0_0]
              bg-[#03277C] text-slate-200 text-sm
            "
          >
            Deployment-CICD
          </div> */}
        
          {/* ปุ่ม + */}
          <button
            className="
          h-6 px-2 grid place-items-center
          rounded-[8px_8px_8px_8px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]
          bg-white/10 hover:bg-white/15 transition
          text-slate-100
        "
            aria-label="New file"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
