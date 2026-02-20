"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function UserMenu() {
  const { data } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ปิดเมนูเมื่อคลิกนอกกล่องหรือกด Esc
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const user = data?.user;
  const initials = useMemo(() => {
    const n = user?.name || user?.email || "U";
    return n.slice(0, 2).toUpperCase();
  }, [user?.name, user?.email]);

  if (!data?.session || !user) return null;

  return (
    <div ref={menuRef} className="relative">
      {/* ปุ่มรูปโปรไฟล์ */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        className="h-9 w-9 overflow-hidden rounded-full border border-white/20 ring-0 outline-none"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? "User"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-700 text-slate-100 text-sm">
            {initials}
          </div>
        )}
      </button>

      {/* เมนู */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 w-56 rounded-xl border border-white/15
            bg-gradient-to-b from-[#0f2a7a] to-[#0a1a4a] text-slate-100
            shadow-xl
          "
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-7 w-7 overflow-hidden rounded-full border border-white/20">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-700 text-slate-100 text-xs">
                  {initials}
                </div>
              )}
            </div>
            <span className="text-base font-medium">View Profile</span>
          </div>

          <div className="h-px w-full bg-white/20" />

          <button className="w-full py-3 text-center text-base hover:bg-white/10 transition">
            Setting
          </button>
          <button className="w-full py-3 text-center text-base hover:bg-white/10 transition">
            Help
          </button>

          <button
            onClick={() =>
              authClient.signOut({
                fetchOptions: { redirect: "follow" },
                query: { redirectTo: "/" },
              })
            }
            className="w-full py-3 text-center text-base hover:bg-white/10 transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
