import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../packages/server/prisma";
import { auth } from "../../../../packages/server/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const repoFilter = searchParams.get("repo"); // "all" หรือ "owner/repo"
        const timeFilter = searchParams.get("time"); // "today", "week", "month", "all"
        const actionFilter = searchParams.get("action"); // "push", "pull_request", "all"
        const branchFilter = searchParams.get("branch");

        // 1. ตั้งต้นเงื่อนไข: ดึงเฉพาะของ User ตัวเอง
        const whereClause: any = {
            userId: session.user.id,
        };

        // 2. กรองตาม Repo
        if (repoFilter && repoFilter !== "all") {
            whereClause.repoFullName = {
                contains: repoFilter,
                mode: "insensitive",
            };
        }

        // 3. กรองตาม Action (Push / PR)
        if (actionFilter && actionFilter !== "all") {
            whereClause.actionType = actionFilter;
        }

        // 4. กรองตามเวลา (Time)
        if (timeFilter && timeFilter !== "all") {
            const now = new Date();
            if (timeFilter === "today") {
                // ย้อนหลัง 24 ชั่วโมง
                whereClause.createdAt = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
            } else if (timeFilter === "week") {
                // ย้อนหลัง 7 วัน
                whereClause.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
            } else if (timeFilter === "month") {
                // ย้อนหลัง 30 วัน
                whereClause.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
            }
        }

        // 5 กรองตาม Branch (ค้นหาแค่บางส่วนได้ ไม่สนตัวพิมพ์เล็ก/ใหญ่)
        if (branchFilter && branchFilter.trim() !== "") {
            whereClause.branch = {
                contains: branchFilter,
                mode: "insensitive",
            };
        }

        // ดึงข้อมูลจาก Database
        const history = await prisma.pipelineHistory.findMany({
            where: whereClause,
            orderBy: {
                createdAt: "desc", // ใหม่สุดขึ้นก่อน
            },
            take: 50, // จำกัดไว้ 50 รายการก่อน กันเว็บหน่วง
        });

        return NextResponse.json({ history });
    } catch (error) {
        console.error("Fetch pipeline history error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}