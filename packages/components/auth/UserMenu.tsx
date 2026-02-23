"use client";

import { useMemo, useState } from "react";
import { authClient } from "../../lib/auth-client";
// 1. เพิ่มไอคอน Copy กับ Check เข้ามา
import { User, LogOut, Github, Gitlab, Mail, Copy, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import Image from "next/image";

export default function UserMenu() {
  const { data } = authClient.useSession();
  const user = data?.user;

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // 2. สร้าง State สำหรับจำว่ากดปุ่ม Copy ID หรือยัง
  const [hasCopiedId, setHasCopiedId] = useState(false);

  const initials = useMemo(() => {
    const n = user?.name || user?.email || "U";
    return n.slice(0, 2).toUpperCase();
  }, [user?.name, user?.email]);

  if (!data?.session || !user) return null;

  // ฟังก์ชันสำหรับกดปุ่ม Copy ID
  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id); // สั่งก๊อปปี้ลง Clipboard
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2000);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="User menu"
            className="h-9 w-9 overflow-hidden rounded-full border border-white/10 ring-0 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all hover:scale-105 shadow-sm"
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                width={36}
                height={36}
                sizes="36px"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-slate-100 text-sm font-semibold">
                {initials}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="w-60 rounded-xl border border-slate-700/50 bg-gradient-to-b from-[#0f2a7a] to-[#0a1a4a] p-1.5 text-slate-200 shadow-2xl backdrop-blur-md"
        >
          <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2.5 font-normal">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-700 shrink-0 shadow-inner">
              {user.image ? (
                <Image
                  src={user.image}
                  alt="Profile"
                  width={36}
                  height={36}
                  sizes="36px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950 text-slate-100 text-xs font-semibold">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-slate-100 truncate">
                {user.name || "User"}
              </span>
              <span className="text-xs text-slate-400 truncate">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-1 h-px bg-white/20" />

          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:bg-slate-800 focus:text-white data-[highlighted]:bg-slate-800 data-[highlighted]:text-white"
            onSelect={(e) => {
              e.preventDefault();
              setIsProfileOpen(true);
            }}
          >
            <User className="h-4 w-4 text-slate-400" />
            View Profile
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 transition-colors focus:bg-red-500/10 focus:text-red-300 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-300"
            onClick={async () => {
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.href = "/login";
                  },
                },
              });
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ========================================== */}
      {/* Profile Dialog */}
      {/* ========================================== */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md border-slate-700/80 bg-gradient-to-br from-blue-900 to-blue-950 text-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Profile Information</DialogTitle>
            <DialogDescription className="text-slate-400">
              Your personal account details and active connections.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4">

            {/* โซน 1: รูปโปรไฟล์และชื่อ */}
            <div className="flex items-center gap-5 border-b border-white/10 pb-6">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-slate-600 shadow-inner shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt="Profile"
                    width={80}
                    height={80}
                    sizes="80px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-800 text-2xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-xl font-semibold truncate">{user.name || "Unknown User"}</span>
                <span className="text-sm text-slate-400 flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {user.email}
                </span>
              </div>
            </div>

            {/* โซน 2: Git Provider */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-300">Connected Provider</span>
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 shrink-0">
                  <Github className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Git Account</span>
                  <span className="text-xs text-slate-400">Connected for repositories</span>
                </div>
                <div className="ml-auto text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                  Active
                </div>
              </div>
            </div>

            {/* โซน 3: รายละเอียดบัญชี */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-slate-300">Account Details</span>
              <div className="flex flex-col gap-3">

                {/* 🔥 กล่อง ID (มีปุ่ม Copy) */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-xs text-slate-400">Account ID</span>
                    {/* ไม่ต้องตัดคำแล้ว ให้แสดงเต็มๆ เผื่อลากคลุม แต่ถ้าล้นให้ซ่อนด้วย truncate */}
                    <span className="text-sm font-mono text-slate-200 truncate">
                      {user.id || "usr_default"}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyId}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    title="Copy ID"
                  >
                    {hasCopiedId ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* กล่อง วันที่สมัคร */}
                <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-black/20 p-3">
                  <span className="text-xs text-slate-400">Member Since</span>
                  <span className="text-sm text-slate-200">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Recently"}
                  </span>
                </div>

              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}