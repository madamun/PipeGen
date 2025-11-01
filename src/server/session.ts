import { auth } from "@/server/auth";

/** คืนค่า session จาก Better Auth โดยอ่าน cookie/header ของ Request ที่เข้ามา */
export async function getServerSession(req: Request) {
  // better-auth มีเมธอดช่วยดึง session จาก request โดยตรง
  // รูปแบบเมธอดอาจต่างเล็กน้อยตามเวอร์ชัน; วิธีทั่วไป:
  return auth.api.getSession({ headers: req.headers });
  // หากเวอร์ชันของคุณใช้ชื่อเมธอดต่างไปเล็กน้อย ให้เรียกดูจาก type hints
}