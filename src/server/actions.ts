"use server";

import { prisma } from "@/server/db";

export async function getPipelineComponents() {
  try {
    // ดึงข้อมูล Categories พร้อม Components ข้างใน
    const categories = await prisma.componentCategory.findMany({
      orderBy: { displayOrder: "asc" }, // เรียงตามลำดับที่เราตั้งไว้
      include: {
        components: {
          include: {
            syntaxes: true, // ดึง Template YAML มาด้วย
          },
        },
      },
    });
    
    return { success: true, data: categories };
  } catch (error) {
    console.error("Failed to fetch components:", error);
    return { success: false, data: [] };
  }
}