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

  const [entries, user] = await Promise.all([
    prisma.termCourse.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            prereqs: { select: { prereqCode: true } },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { currentTerm: true },
    }),
  ]);

  return NextResponse.json({
    currentTerm: user?.currentTerm ?? "1A",
    entries,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { currentTerm } = await request.json();

  if (!currentTerm) {
    return NextResponse.json(
      { error: "currentTerm is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { currentTerm },
    select: { currentTerm: true },
  });

  return NextResponse.json(user);
}

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { courseCode, term } = await request.json();

  if (!courseCode || !term) {
    return NextResponse.json(
      { error: "courseCode and term are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.termCourse.create({
    data: { userId, courseCode, term },
    include: {
      course: {
        include: {
          prereqs: { select: { prereqCode: true } },
        },
      },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { courseCode, term } = await request.json();

  if (!courseCode || !term) {
    return NextResponse.json(
      { error: "courseCode and term are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.termCourse.update({
    where: { userId_courseCode: { userId, courseCode } },
    data: { term },
    include: { course: true },
  });

  return NextResponse.json(entry);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { courseCode } = await request.json();

  if (!courseCode) {
    return NextResponse.json(
      { error: "courseCode is required" },
      { status: 400 }
    );
  }

  await prisma.termCourse.delete({
    where: { userId_courseCode: { userId, courseCode } },
  });

  return NextResponse.json({ deleted: courseCode });
}
