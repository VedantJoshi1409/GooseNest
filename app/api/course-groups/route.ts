import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const groups = await prisma.courseGroup.findMany({
    include: { links: { include: { course: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, courseCodes } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const group = await prisma.courseGroup.create({
    data: {
      name,
      links: courseCodes?.length
        ? {
            createMany: {
              data: courseCodes.map((courseCode: string) => ({ courseCode })),
            },
          }
        : undefined,
    },
    include: { links: { include: { course: true } } },
  });

  return NextResponse.json(group, { status: 201 });
}
