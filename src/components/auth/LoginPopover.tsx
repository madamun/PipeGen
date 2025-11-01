"use client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import SignInCard from "./SignInCard";
import { GitBranch } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import UserMenu from "./UserMenu";

export default function LoginPopover() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return <Button disabled className="opacity-70">Loading…</Button>;
  }

  // ถ้าล็อกอินแล้ว ใช้เมนูผู้ใช้
  if (data?.session) {
    return <UserMenu />;
  }

  // ยังไม่ล็อกอิน
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="bg-[#3b82f6] hover:bg-[#2f6ad6]">
          <GitBranch className="mr-2 h-4 w-4" />
          Connect to Git Provider
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="p-0 border-0 bg-transparent shadow-none w-auto"
      >
        <SignInCard />
      </PopoverContent>
    </Popover>
  );
}
