import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ฟังก์ชันหลักของยามเฝ้าประตู
export async function proxy(request: NextRequest) {
  // const { pathname } = request.nextUrl;

  // // 1. ปล่อยผ่าน (Whitelist): ถ้าเป็นหน้า Login หรือพวกไฟล์ระบบ/API ไม่ต้องตรวจ
  // if (
  //   pathname.startsWith("/login") ||
  //   pathname.startsWith("/api") ||
  //   pathname.startsWith("/_next") ||
  //   pathname.includes(".") // ปล่อยผ่านไฟล์รูปภาพเช่น logo.svg, favicon.ico
  // ) {
  //   return NextResponse.next();
  // }

  // // 2. ตรวจบัตรผ่าน: เช็คคุกกี้ที่ Better-Auth สร้างไว้ตอน Login
  // // (รองรับทั้งแบบรันในเครื่อง localhost และแบบ https ขึ้นโฮสต์จริง)
  // const sessionCookie = 
  //   request.cookies.get("better-auth.session_token") || 
  //   request.cookies.get("__Secure-better-auth.session_token");

  // // 3. เตะออก: ถ้าไม่มีบัตร (คุกกี้ว่างเปล่า) ให้เด้งไปหน้า /login
  // if (!sessionCookie) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  // // 4. ยินดีต้อนรับ: ถ้ามีคุกกี้ แปลว่า Login แล้ว ให้เข้าเว็บได้ตามปกติ!
  // return NextResponse.next();
}

// ตั้งค่าให้ยามทำงาน "ทุกหน้า" (ยกเว้นพวกไฟล์ระบบที่ Next.js จัดการเอง)
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      */
//     "/((?!api|_next/static|_next/image|favicon.ico).*)",
//   ],
// };