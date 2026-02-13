import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ name: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { name } = await params;

  const faculty = await prisma.faculty.findUnique({
    where: { name },
    include: { courses: { orderBy: { code: "asc" } } },
  });

  if (!faculty) {
    return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
  }

  return NextResponse.json(faculty);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { name } = await params;

  await prisma.faculty.delete({ where: { name } });

  return NextResponse.json({ deleted: name });
}
