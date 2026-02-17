import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; reqId: string }> };

async function parseParams(params: Params["params"]) {
  const { id, reqId } = await params;
  const userId = parseInt(id, 10);
  const requirementId = parseInt(reqId, 10);
  if (isNaN(userId) || isNaN(requirementId)) return null;
  return { userId, requirementId };
}

/**
 * POST /api/users/[id]/degree/requirements/[reqId]/courses
 * Body: { courseCode: string, term?: string }
 *
 * Adds a course to a requirement's courseGroup. Creates a courseGroup if
 * the requirement doesn't have one. If term is provided, also schedules
 * the course in that term.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const parsed = await parseParams(params);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
  }

  const { userId, requirementId } = parsed;
  const body = await request.json();
  const { courseCode, term } = body;

  if (!courseCode || typeof courseCode !== "string") {
    return NextResponse.json(
      { error: "courseCode (string) is required" },
      { status: 400 },
    );
  }

  // Verify course exists
  const course = await prisma.course.findUnique({ where: { code: courseCode } });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.plan) {
    return NextResponse.json(
      { error: "No degree selected" },
      { status: 400 },
    );
  }

  // Verify requirement exists in the plan
  const exists = await prisma.planRequirement.findFirst({
    where: { id: requirementId, planId: user.plan.id },
  });
  if (!exists) {
    return NextResponse.json(
      { error: "Requirement not found in plan" },
      { status: 404 },
    );
  }

  const planReqId = requirementId;
  const planId = user.plan.id;

  // Fetch the plan requirement to check if it has a courseGroup
  const planReq = await prisma.planRequirement.findUnique({
    where: { id: planReqId },
  });

  if (!planReq) {
    return NextResponse.json(
      { error: "Plan requirement not found" },
      { status: 404 },
    );
  }

  let groupId = planReq.courseGroupId;

  // Create a courseGroup if the requirement doesn't have one
  if (!groupId) {
    const newGroup = await prisma.courseGroup.create({
      data: { name: planReq.name },
    });

    await prisma.planRequirement.update({
      where: { id: planReqId },
      data: { courseGroupId: newGroup.id },
    });

    groupId = newGroup.id;
  }

  // Check if course is already in the group
  const existing = await prisma.courseGroupLink.findUnique({
    where: { groupId_courseCode: { groupId, courseCode } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Course already in this requirement" },
      { status: 409 },
    );
  }

  // Add the course link
  const link = await prisma.courseGroupLink.create({
    data: { groupId, courseCode },
    include: { course: true },
  });

  // Optionally schedule the course
  if (term && typeof term === "string") {
    await prisma.termCourse.upsert({
      where: { userId_courseCode: { userId, courseCode } },
      create: { userId, courseCode, term },
      update: { term },
    });
  }

  return NextResponse.json({ link, groupId, planId }, { status: 201 });
}
