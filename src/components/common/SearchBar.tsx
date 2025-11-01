"use client";

import { Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div
      className="
       w-[300px]  flex  h-8 shrink-0 items-center justify-end
        rounded-[32px] border border-[rgba(180,202,253,0)]
        bg-[#050b1a] overflow-hidden
      "
    >
      <input
        type="text"
        placeholder="Search"
        className="
          flex-1 h-full bg-transparent px-3 text-sm text-white
          placeholder:text-white/50 outline-none
        "
      />
      <button
        type="submit"
        className="flex h-full w-10 items-center justify-center bg-[#13307a]"
      >
        <Search className="h-4 w-4 text-white/80" />
      </button>
    </div>
  );
}
