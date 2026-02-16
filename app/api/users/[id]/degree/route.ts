import { prisma } from "@/lib/prisma";
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

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // First, check which type the user has (lightweight query)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Only load the tree that's actually needed
  if (user.plan) {
    const plan = await prisma.plan.findUnique({
      where: { id: user.plan.id },
      include: {
        template: true,
        requirements: {
          where: { parentId: null },
          ...reqInclude,
        },
      },
    });
    return NextResponse.json({ type: "plan", template: null, plan });
  }

  if (user.templateId) {
    const template = await prisma.template.findUnique({
      where: { id: user.templateId },
      include: {
        requirements: {
          where: { parentId: null },
          ...reqInclude,
        },
      },
    });
    return NextResponse.json({ type: "template", template, plan: null });
  }

  return NextResponse.json({ type: "none", template: null, plan: null });
}

/**
 * POST /api/users/[id]/degree
 *
 * Body for default template (no modifications):
 *   { "templateId": 1 }
 *
 * Body for custom plan (modifications made):
 *   {
 *     "templateId": 1,
 *     "name": "My CS Plan",
 *     "requirements": [
 *       { "name": "CS Core", "amount": 3, "courseGroupId": 1 },
 *       { "name": "Custom Electives", "amount": 2, "courseCodes": ["CS135", "MATH135"] }
 *     ]
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

  // Delete any existing plan for this user
  await prisma.plan.deleteMany({ where: { userId } });

  const isCustom = requirements && requirements.length > 0;

  if (!isCustom) {
    // No modifications — just link the template directly
    const user = await prisma.user.update({
      where: { id: userId },
      data: { templateId },
      include: { template: true },
    });

    return NextResponse.json({ type: "template", template: user.template });
  }

  // Custom plan — create plan with requirements
  const plan = await prisma.plan.create({
    data: {
      name: name || `Custom Plan`,
      userId,
      templateId,
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

  // Clear the default template reference since we're using a custom plan
  await prisma.user.update({
    where: { id: userId },
    data: { templateId: null },
  });

  const fullPlan = await prisma.plan.findUnique({
    where: { id: plan.id },
    include: {
      template: true,
      requirements: {
        where: { parentId: null },
        ...reqInclude,
      },
    },
  });

  return NextResponse.json({ type: "plan", plan: fullPlan }, { status: 201 });
}
