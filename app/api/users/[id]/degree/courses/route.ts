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
 * Recursively search for a PlanRequirement by courseGroupId in a tree.
 */
function findPlanReqByGroupId(
  reqs: any[],
  groupId: number,
): any | null {
  for (const r of reqs) {
    if (r.courseGroup?.id === groupId) return r;
    if (r.children && r.children.length > 0) {
      const found = findPlanReqByGroupId(r.children, groupId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Ensures the user has a plan with a private copy of the specified course group.
 * If the user is on a template, creates a plan and copies the whole tree.
 * If the user already has a plan but the group is shared, copies just that group.
 * Returns the private courseGroupId to modify.
 */
async function ensurePrivateGroup(userId: number, courseGroupId: number) {
  // Build recursive include (4 levels)
  function reqInclude(depth: number): any {
    const base: any = {
      include: {
        courseGroup: { include: { links: true } },
      },
    };
    if (depth > 0) {
      base.include.children = reqInclude(depth - 1);
    } else {
      base.include.children = true;
    }
    return base;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      template: {
        include: {
          requirements: {
            where: { parentId: null },
            ...reqInclude(4),
          },
        },
      },
      plan: {
        include: {
          requirements: {
            where: { parentId: null },
            ...reqInclude(4),
          },
        },
      },
    },
  });

  if (!user) return null;

  // Case 1: User is on a template (no plan) — create a plan, copy entire tree
  if (!user.plan && user.template) {
    const groupIdMap = new Map<number, number>();

    const plan = await prisma.plan.create({
      data: {
        name: `${user.template.name} (Custom)`,
        userId,
        templateId: user.template.id,
      },
    });

    await copyRequirementTree(
      plan.id,
      user.template.requirements as unknown as ReqTreeNode[],
      null,
      groupIdMap,
    );

    // Clear template reference
    await prisma.user.update({
      where: { id: userId },
      data: { templateId: null },
    });

    return {
      planId: plan.id,
      privateGroupId: groupIdMap.get(courseGroupId) ?? courseGroupId,
    };
  }

  // Case 2: User already has a plan
  if (user.plan) {
    // Find the requirement anywhere in the tree
    const planReq = findPlanReqByGroupId(
      user.plan.requirements,
      courseGroupId,
    );

    if (planReq) {
      // Check if this group is also used by any template requirement (shared)
      const templateUsage = await prisma.requirement.findFirst({
        where: { courseGroupId },
      });

      if (!templateUsage) {
        // Group is private to the plan, safe to modify directly
        return { planId: user.plan.id, privateGroupId: courseGroupId };
      }

      // Group is shared with a template — copy it
      const originalGroup = planReq.courseGroup;
      const copiedGroup = await prisma.courseGroup.create({
        data: {
          name: originalGroup.name,
          links: {
            createMany: {
              data: originalGroup.links.map((l: any) => ({
                courseCode: l.courseCode,
              })),
            },
          },
        },
      });

      // Update the plan requirement to point to the copy
      await prisma.planRequirement.update({
        where: { id: planReq.id },
        data: { courseGroupId: copiedGroup.id },
      });

      return { planId: user.plan.id, privateGroupId: copiedGroup.id };
    }

    // Group not found in plan requirements
    return null;
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
