import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const faculties = await prisma.faculty.findMany({
    include: { courses: { select: { code: true, title: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(faculties);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const faculty = await prisma.faculty.create({
    data: { name },
  });

  return NextResponse.json(faculty, { status: 201 });
}
