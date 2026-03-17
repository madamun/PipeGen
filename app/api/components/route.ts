import { NextResponse } from "next/server";
import { prisma } from "../../../packages/server/prisma";

export async function GET() {
    const categories = await prisma.componentCategory.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      components: {
        orderBy: { id: "asc" },
        include: { syntaxes: true },
      },
    },
  });
  return NextResponse.json(categories);
}
