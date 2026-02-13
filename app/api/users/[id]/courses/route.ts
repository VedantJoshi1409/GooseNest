import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const courses = await prisma.userCourse.findMany({
    where: { userId },
    include: { course: true },
  });

  return NextResponse.json(courses);
}

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await request.json();
  const { courseCode } = body;

  if (!courseCode) {
    return NextResponse.json({ error: "courseCode is required" }, { status: 400 });
  }

  const entry = await prisma.userCourse.create({
    data: { userId, courseCode },
    include: { course: true },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { courseCode } = await request.json();

  if (!courseCode) {
    return NextResponse.json({ error: "courseCode is required" }, { status: 400 });
  }

  await prisma.userCourse.delete({
    where: { userId_courseCode: { userId, courseCode } },
  });

  return NextResponse.json({ deleted: courseCode });
}
