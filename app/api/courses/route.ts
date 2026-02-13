import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const faculty = request.nextUrl.searchParams.get("faculty");

  const courses = await prisma.course.findMany({
    where: faculty ? { facultyName: faculty } : undefined,
    include: {
      faculty: true,
      prereqs: { select: { prereqCode: true } },
      unlocks: { select: { courseCode: true } },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(courses);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code, title, facultyName, prerequisites } = body;

  if (!code || !title || !facultyName) {
    return NextResponse.json(
      { error: "code, title, and facultyName are required" },
      { status: 400 }
    );
  }

  const course = await prisma.course.create({
    data: {
      code,
      title,
      facultyName,
      prereqs: prerequisites?.length
        ? {
            createMany: {
              data: prerequisites.map((prereqCode: string) => ({ prereqCode })),
            },
          }
        : undefined,
    },
    include: {
      faculty: true,
      prereqs: { select: { prereqCode: true } },
    },
  });

  return NextResponse.json(course, { status: 201 });
}
