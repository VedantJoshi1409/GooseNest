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

/**
 * PATCH /api/users/[id]/degree/requirements/[reqId]
 * Body: { forceCompleted: boolean }
 *
 * Toggles force-complete on a requirement. If user is on a template,
 * first copies the tree into a plan.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const parsed = await parseParams(params);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
  }

  const { userId, requirementId } = parsed;
  const body = await request.json();
  const { forceCompleted } = body;

  if (typeof forceCompleted !== "boolean") {
    return NextResponse.json(
      { error: "forceCompleted (boolean) is required" },
      { status: 400 },
    );
  }

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

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If user is on a template, copy into a plan first
  if (!user.plan && user.template) {
    const reqIdMap = new Map<number, number>();

    const plan = await prisma.plan.create({
      data: {
        name: `${user.template.name} (Custom)`,
        userId,
        templateId: user.template.id,
      },
    });

    await copyReqTree(
      plan.id,
      user.template.requirements as unknown as ReqTreeNode[],
      null,
      reqIdMap,
    );

    await prisma.user.update({
      where: { id: userId },
      data: { templateId: null },
    });

    // Find the corresponding plan requirement
    const planReqId = reqIdMap.get(requirementId);
    if (!planReqId) {
      return NextResponse.json(
        { error: "Requirement not found in copied plan" },
        { status: 404 },
      );
    }

    const updated = await prisma.planRequirement.update({
      where: { id: planReqId },
      data: { forceCompleted },
    });

    return NextResponse.json({ planRequirement: updated, planId: plan.id });
  }

  // User already has a plan — update directly
  if (user.plan) {
    // The reqId should be a PlanRequirement ID
    const updated = await prisma.planRequirement.update({
      where: { id: requirementId, planId: user.plan.id },
      data: { forceCompleted },
    });

    return NextResponse.json({ planRequirement: updated, planId: user.plan.id });
  }

  return NextResponse.json(
    { error: "No degree selected" },
    { status: 400 },
  );
}
