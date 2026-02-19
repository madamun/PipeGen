"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import Gitconnect from "./Gitconnect";

// --- ส่วนย่อย: Logo (ยุบรวมมาไว้ที่นี่) ---
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      <Image
        src="/logo.svg" // ตรวจสอบว่ามีไฟล์ logo.svg ใน folder public แล้ว
        alt="Logo"
        width={40}
        height={40}
        priority
      />
      <span className="bg-gradient-to-r from-[#E6EDFE] to-[#83A7FC] bg-clip-text text-2xl font-semibold text-transparent">
        Pipe Gen
      </span>
    </Link>
  );
}

// --- ส่วนย่อย: SearchBar (ยุบรวมมาไว้ที่นี่ และ Export เผื่อคนอื่นใช้) ---
export function SearchBar() {
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        
        // 🔥🔥🔥 เพิ่มการตรวจสอบตรงนี้ (Guard Clause) 🔥🔥🔥
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
           target.tagName === "TEXTAREA" ||
           target.isContentEditable ||
           target.closest(".monaco-editor")) // ดักจับ Monaco Editor
        ) {
          // ถ้ากำลังพิมพ์ในช่องพิมพ์อื่นๆ อยู่ ให้ Return ออกไปเลย (ไม่ต้องทำอะไร)
          return;
        }
        // 🔥🔥🔥 สิ้นสุดส่วนที่เพิ่ม 🔥🔥🔥

        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = () => {
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="Search"
        className="
          h-8 w-full rounded-full border border-black/10 bg-[#010819]
          px-10 text-sm text-white/90 placeholder:text-white/40 outline-none shadow-inner
          focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all
        "
      />
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B4CAFD]" />
    </div>
  );
}
// --- Component หลัก: Navbar ---
export default function Navbar() {
  return (
    <nav
      className="
        sticky top-0 z-40 border-b border-white/10 bg-[#02184B]
        flex h-16 justify-center items-center shrink-0 self-stretch px-6 shadow-md
      "
    >
      {/* ซ้าย: LOGO */}
      <div className="flex flex-1 items-center gap-2">
        <Logo />
      </div>

      {/* กลาง: SEARCH */}
      <div className="flex flex-1 justify-center items-center">
        <div className="w-[clamp(200px,30vw,400px)]">
           <SearchBar />
        </div>
      </div>

      {/* ขวา: GITCONNECT */}
      <div className="flex flex-1 justify-end items-center gap-4">
        <Gitconnect />
      </div>
    </nav>
  );
}