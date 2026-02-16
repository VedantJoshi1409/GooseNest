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

// Recursive type for requirement trees
interface ReqTreeNode {
  id: number;
  name: string;
  amount: number;
  isText: boolean;
  courseGroupId: number | null;
  courseGroup: { id: number; name: string; links: { courseCode: string }[] } | null;
  children: ReqTreeNode[];
}

/**
 * Recursively copy template requirements into PlanRequirements.
 * Returns a map from template requirement ID → plan requirement ID.
 */
async function copyReqTree(
  planId: number,
  reqs: ReqTreeNode[],
  parentId: number | null,
  reqIdMap: Map<number, number>,
) {
  for (const req of reqs) {
    let newGroupId = req.courseGroupId;

    if (req.courseGroup && req.courseGroupId) {
      const copiedGroup = await prisma.courseGroup.create({
        data: {
          name: req.courseGroup.name,
          links: {
            createMany: {
              data: req.courseGroup.links.map((l) => ({
                courseCode: l.courseCode,
              })),
            },
          },
        },
      });
      newGroupId = copiedGroup.id;
    }

    const planReq = await prisma.planRequirement.create({
      data: {
        name: req.name,
        amount: req.amount,
        isText: req.isText,
        courseGroupId: newGroupId,
        planId,
        parentId,
      },
    });

    reqIdMap.set(req.id, planReq.id);

    if (req.children && req.children.length > 0) {
      await copyReqTree(planId, req.children, planReq.id, reqIdMap);
    }
  }
}

function reqInclude(depth: number): any {
  const base: any = {
    orderBy: { id: "asc" as const },
    include: {
      courseGroup: { include: { links: true } },
    },
  };
  if (depth > 0) {
    base.include.children = reqInclude(depth - 1);
  } else {
    base.include.children = { orderBy: { id: "asc" as const } };
  }
  return base;
}

/**
 * POST /api/users/[id]/degree/requirements/[reqId]/courses
 * Body: { courseCode: string, term?: string }
 *
 * Adds a course to a requirement. If the requirement has no courseGroup,
 * creates one first. If the user is on a template, copies into a plan first.
 * If term is provided, also schedules the course in that term.
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

  let planReqId: number;
  let planId: number;

  // If user is on a template, load the full tree and copy into a plan
  if (!user.plan && user.templateId) {
    const template = await prisma.template.findUnique({
      where: { id: user.templateId },
      include: {
        requirements: {
          where: { parentId: null },
          ...reqInclude(4),
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const reqIdMap = new Map<number, number>();

    const plan = await prisma.plan.create({
      data: {
        name: `${template.name} (Custom)`,
        userId,
        templateId: template.id,
      },
    });

    await copyReqTree(
      plan.id,
      template.requirements as unknown as ReqTreeNode[],
      null,
      reqIdMap,
    );

    await prisma.user.update({
      where: { id: userId },
      data: { templateId: null },
    });

    const mappedId = reqIdMap.get(requirementId);
    if (!mappedId) {
      return NextResponse.json(
        { error: "Requirement not found in copied plan" },
        { status: 404 },
      );
    }

    planReqId = mappedId;
    planId = plan.id;
  } else if (user.plan) {
    // Verify requirement exists in the plan with a direct query
    const exists = await prisma.planRequirement.findFirst({
      where: { id: requirementId, planId: user.plan.id },
    });
    if (!exists) {
      return NextResponse.json(
        { error: "Requirement not found in plan" },
        { status: 404 },
      );
    }
    planReqId = requirementId;
    planId = user.plan.id;
  } else {
    return NextResponse.json(
      { error: "No degree selected" },
      { status: 400 },
    );
  }

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
