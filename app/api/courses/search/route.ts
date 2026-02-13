import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { code: "asc" },
    take: 20,
  });

  return NextResponse.json(courses);
}
