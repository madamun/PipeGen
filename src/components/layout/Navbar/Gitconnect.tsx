"use client";

import LoginPopover from "@/components/auth/LoginPopover";

export default function Gitconnect() {
  // ไม่ต้องใช้ useSession ที่ไหนแล้ว ให้ LoginPopover จัดการให้หมด
  return <LoginPopover />;
}
