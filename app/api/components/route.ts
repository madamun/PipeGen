import { NextResponse } from "next/server";
import { prisma } from "../../../packages/server/prisma";

export async function GET() {
  const categories = await prisma.componentCategory.findMany({
    include: {
      components: {
        include: { syntaxes: true }, // เอา Template มาด้วย
        // orderBy: { name: 'asc' }
      },
    },
    // orderBy: { displayOrder: 'asc' }
  });
  return NextResponse.json(categories);
}
