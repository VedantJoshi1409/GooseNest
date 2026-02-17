import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

/**
 * Ensures the user has a plan with a private copy of the specified course group.
 * If the group is shared with a template, copies just that group.
 * Returns the private courseGroupId to modify.
 */
async function ensurePrivateGroup(userId: number, courseGroupId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user || !user.plan) return null;

  const planReq = await prisma.planRequirement.findFirst({
    where: { planId: user.plan.id, courseGroupId },
  });

  if (!planReq) return null;

  // Check if this group is also used by any template requirement (shared)
  const templateUsage = await prisma.requirement.findFirst({
    where: { courseGroupId },
  });

  if (!templateUsage) {
    // Group is private to the plan, safe to modify directly
    return { planId: user.plan.id, privateGroupId: courseGroupId };
  }

  // Group is shared with a template — copy it
  const originalGroup = await prisma.courseGroup.findUnique({
    where: { id: courseGroupId },
    include: { links: true },
  });

  if (!originalGroup) return null;

  const copiedGroup = await prisma.courseGroup.create({
    data: {
      name: originalGroup.name,
      links: {
        createMany: {
          data: originalGroup.links.map((l) => ({
            courseCode: l.courseCode,
          })),
        },
      },
    },
  });

  await prisma.planRequirement.update({
    where: { id: planReq.id },
    data: { courseGroupId: copiedGroup.id },
  });

  return { planId: user.plan.id, privateGroupId: copiedGroup.id };
}

/**
 * POST /api/users/[id]/degree/courses
 * Body: { courseGroupId: number, courseCode: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { courseGroupId, courseCode } = await request.json();
  if (!courseGroupId || !courseCode) {
    return NextResponse.json(
      { error: "courseGroupId and courseCode are required" },
      { status: 400 }
    );
  }

  const result = await ensurePrivateGroup(userId, courseGroupId);
  if (!result) {
    return NextResponse.json(
      { error: "Could not resolve user degree" },
      { status: 404 }
    );
  }

  const link = await prisma.courseGroupLink.create({
    data: { groupId: result.privateGroupId, courseCode },
    include: { course: true },
  });

  return NextResponse.json({
    link,
    privateGroupId: result.privateGroupId,
  }, { status: 201 });
}

/**
 * DELETE /api/users/[id]/degree/courses
 * Body: { courseGroupId: number, courseCode: string }
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { courseGroupId, courseCode } = await request.json();
  if (!courseGroupId || !courseCode) {
    return NextResponse.json(
      { error: "courseGroupId and courseCode are required" },
      { status: 400 }
    );
  }

  const result = await ensurePrivateGroup(userId, courseGroupId);
  if (!result) {
    return NextResponse.json(
      { error: "Could not resolve user degree" },
      { status: 404 }
    );
  }

  await prisma.courseGroupLink.delete({
    where: {
      groupId_courseCode: {
        groupId: result.privateGroupId,
        courseCode,
      },
    },
  });

  return NextResponse.json({
    deleted: courseCode,
    privateGroupId: result.privateGroupId,
  });
}
