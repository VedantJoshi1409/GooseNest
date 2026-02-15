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
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const group = await prisma.courseGroup.findUnique({
    where: { id },
    include: {
      links: { include: { course: true } },
      requirements: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Course group not found" }, { status: 404 });
  }

  return NextResponse.json(group);
}

export async function POST(request: NextRequest, { params }: Params) {
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const { courseCode } = await request.json();
  if (!courseCode) {
    return NextResponse.json({ error: "courseCode is required" }, { status: 400 });
  }

  const link = await prisma.courseGroupLink.create({
    data: { groupId: id, courseCode },
    include: { course: true },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const body = await request.json();
  const { name, courseCodes } = body;

  const group = await prisma.courseGroup.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(courseCodes && {
        links: {
          deleteMany: {},
          createMany: {
            data: courseCodes.map((courseCode: string) => ({ courseCode })),
          },
        },
      }),
    },
    include: { links: { include: { course: true } } },
  });

  return NextResponse.json(group);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { courseCode } = body;

  if (courseCode) {
    // Remove a single course from the group
    await prisma.courseGroupLink.delete({
      where: { groupId_courseCode: { groupId: id, courseCode } },
    });
    return NextResponse.json({ deleted: courseCode, groupId: id });
  }

  // Delete the entire group
  await prisma.courseGroup.delete({ where: { id } });
  return NextResponse.json({ deleted: id });
}
