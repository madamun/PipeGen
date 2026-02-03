import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth"; // หรือ path ที่คุณเก็บ auth setup

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ providers: [] });

  // ดึงข้อมูลว่า User คนนี้มี Account อะไรบ้างใน DB
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { providerId: true },
  });

  // ส่งกลับไปเป็น array เช่น ['github'] หรือ ['gitlab'] หรือ ['github', 'gitlab']
  const providers = accounts.map((a) => a.providerId); 
  return NextResponse.json({ providers });
}