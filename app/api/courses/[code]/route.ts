import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { code } = await params;

  const course = await prisma.course.findUnique({
    where: { code },
    include: {
      faculty: true,
      prereqs: { include: { prereq: true } },
      unlocks: { include: { course: true } },
      courseGroups: { include: { courseGroup: true } },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { code } = await params;
  const body = await request.json();
  const { title, facultyName, prerequisites } = body;

  const course = await prisma.course.update({
    where: { code },
    data: {
      ...(title && { title }),
      ...(facultyName && { facultyName }),
      ...(prerequisites && {
        prereqs: {
          deleteMany: {},
          createMany: {
            data: prerequisites.map((prereqCode: string) => ({ prereqCode })),
          },
        },
      }),
    },
    include: {
      faculty: true,
      prereqs: { select: { prereqCode: true } },
    },
  });

  return NextResponse.json(course);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { code } = await params;

  await prisma.course.delete({ where: { code } });

  return NextResponse.json({ deleted: code });
}
