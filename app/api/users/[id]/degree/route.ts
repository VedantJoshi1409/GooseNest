import { prisma, deleteUserPlansWithCustomGroups } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

// Prisma doesn't support recursive includes, so we hardcode 4 levels deep
const courseGroupInclude = {
  include: { links: { include: { course: true } } },
} as const;

function requirementInclude(depth: number): any {
  const base: any = {
    orderBy: { id: "asc" as const },
    include: {
      courseGroup: courseGroupInclude,
    },
  };
  if (depth > 0) {
    base.include.children = requirementInclude(depth - 1);
  } else {
    base.include.children = { orderBy: { id: "asc" as const } };
  }
  return base;
}

const reqInclude = requirementInclude(2);

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
 */
async function copyReqTree(
  planId: number,
  reqs: ReqTreeNode[],
  parentId: number | null,
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

    if (req.children && req.children.length > 0) {
      await copyReqTree(planId, req.children, planReq.id);
    }
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.plan) {
    const plan = await prisma.plan.findUnique({
      where: { id: user.plan.id },
      include: {
        requirements: {
          where: { parentId: null },
          ...reqInclude,
        },
      },
    });
    return NextResponse.json({ type: "plan", plan });
  }

  return NextResponse.json({ type: "none", plan: null });
}

/**
 * POST /api/users/[id]/degree
 *
 * Always creates a Plan copy. Body:
 *   {
 *     "templateId": 1,
 *     "name": "My CS Plan",          // optional
 *     "requirements": [...]           // optional — if omitted, copies all from template
 *   }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await request.json();
  const { templateId, name, requirements } = body;

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  // Delete any existing plan and its custom course groups
  await deleteUserPlansWithCustomGroups(userId);

  const hasCustomRequirements = requirements && requirements.length > 0;

  if (!hasCustomRequirements) {
    // No custom requirements — copy all requirements from the template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        requirements: {
          where: { parentId: null },
          ...requirementInclude(4),
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const plan = await prisma.plan.create({
      data: {
        name: name || template.name,
        userId,
        templateName: template.name,
      },
    });

    await copyReqTree(
      plan.id,
      template.requirements as unknown as ReqTreeNode[],
      null,
    );

    const fullPlan = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        requirements: {
          where: { parentId: null },
          ...reqInclude,
        },
      },
    });

    return NextResponse.json({ type: "plan", plan: fullPlan }, { status: 201 });
  }

  // Custom requirements — create plan with provided requirements
  const templateForName = await prisma.template.findUnique({
    where: { id: templateId },
    select: { name: true },
  });

  if (!templateForName) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const plan = await prisma.plan.create({
    data: {
      name: name || `Custom Plan`,
      userId,
      templateName: templateForName.name,
    },
  });

  for (const req of requirements) {
    let courseGroupId = req.courseGroupId;

    if (!courseGroupId) {
      const facultyGroupIds: number[] = req.facultyGroupIds || [];
      const courseCodes: string[] = req.courseCodes || [];

      if (facultyGroupIds.length === 1 && courseCodes.length === 0) {
        courseGroupId = facultyGroupIds[0];
      } else if (facultyGroupIds.length > 0 || courseCodes.length > 0) {
        const unionCodes = new Set<string>(courseCodes);

        if (facultyGroupIds.length > 0) {
          const facultyLinks = await prisma.courseGroupLink.findMany({
            where: { groupId: { in: facultyGroupIds } },
            select: { courseCode: true },
          });
          for (const link of facultyLinks) {
            unionCodes.add(link.courseCode);
          }
        }

        if (unionCodes.size > 0) {
          const group = await prisma.courseGroup.create({
            data: { name: req.name },
          });
          const codes = [...unionCodes];
          const BATCH = 500;
          for (let i = 0; i < codes.length; i += BATCH) {
            await prisma.courseGroupLink.createMany({
              data: codes.slice(i, i + BATCH).map((code) => ({
                groupId: group.id,
                courseCode: code,
              })),
            });
          }
          courseGroupId = group.id;
        }
      }
    }

    if (courseGroupId) {
      await prisma.planRequirement.create({
        data: {
          name: req.name,
          amount: req.amount,
          courseGroupId,
          planId: plan.id,
        },
      });
    }
  }

  const fullPlan = await prisma.plan.findUnique({
    where: { id: plan.id },
    include: {
      requirements: {
        where: { parentId: null },
        ...reqInclude,
      },
    },
  });

  return NextResponse.json({ type: "plan", plan: fullPlan }, { status: 201 });
}
