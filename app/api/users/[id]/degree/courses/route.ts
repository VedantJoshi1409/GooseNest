import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

// Recursive type for requirement trees (template or plan)
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
 * Recursively copy a template requirement tree into PlanRequirements.
 * Returns a map from old courseGroupId → new courseGroupId.
 */
async function copyRequirementTree(
  planId: number,
  reqs: ReqTreeNode[],
  parentId: number | null,
  groupIdMap: Map<number, number>,
) {
  for (const req of reqs) {
    let newGroupId = req.courseGroupId;

    if (req.courseGroup && req.courseGroupId) {
      // Copy the course group
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
      groupIdMap.set(req.courseGroupId, copiedGroup.id);
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

    if (req.children && req.children.length > 0) {
      await copyRequirementTree(planId, req.children, planReq.id, groupIdMap);
    }
  }
}

/**
 * Ensures the user has a plan with a private copy of the specified course group.
 * If the user is on a template, creates a plan and copies the whole tree.
 * If the user already has a plan but the group is shared, copies just that group.
 * Returns the private courseGroupId to modify.
 */
async function ensurePrivateGroup(userId: number, courseGroupId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user) return null;

  // Case 1: User is on a template (no plan) — need full tree to copy
  if (!user.plan && user.templateId) {
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

    const template = await prisma.template.findUnique({
      where: { id: user.templateId },
      include: {
        requirements: {
          where: { parentId: null },
          ...reqInclude(4),
        },
      },
    });

    if (!template) return null;

    const groupIdMap = new Map<number, number>();

    const plan = await prisma.plan.create({
      data: {
        name: `${template.name} (Custom)`,
        userId,
        templateId: template.id,
      },
    });

    await copyRequirementTree(
      plan.id,
      template.requirements as unknown as ReqTreeNode[],
      null,
      groupIdMap,
    );

    await prisma.user.update({
      where: { id: userId },
      data: { templateId: null },
    });

    return {
      planId: plan.id,
      privateGroupId: groupIdMap.get(courseGroupId) ?? courseGroupId,
    };
  }

  // Case 2: User already has a plan — find the requirement by courseGroupId directly
  if (user.plan) {
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

  return null;
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
