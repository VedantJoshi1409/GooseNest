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
 * If the user is on a template, creates a plan and copies all course groups.
 * If the user already has a plan but the group is shared, copies just that group.
 * Returns the private courseGroupId to modify.
 */
async function ensurePrivateGroup(userId: number, courseGroupId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      template: {
        include: {
          requirements: {
            include: { courseGroup: { include: { links: true } } },
          },
        },
      },
      plan: {
        include: {
          requirements: {
            include: { courseGroup: { include: { links: true } } },
          },
        },
      },
    },
  });

  if (!user) return null;

  // Case 1: User is on a template (no plan) — create a plan, copy all groups
  if (!user.plan && user.template) {
    const groupIdMap = new Map<number, number>();

    // Copy each template course group
    for (const req of user.template.requirements) {
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
      groupIdMap.set(req.courseGroup.id, copiedGroup.id);
    }

    // Create a plan with copied groups
    const plan = await prisma.plan.create({
      data: {
        name: `${user.template.name} (Custom)`,
        userId,
        templateId: user.template.id,
        requirements: {
          createMany: {
            data: user.template.requirements.map((req) => ({
              name: req.courseGroup.name,
              amount: req.amount,
              courseGroupId: groupIdMap.get(req.courseGroup.id)!,
            })),
          },
        },
      },
    });

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
    // Check if the group is already private to this plan
    const planReq = user.plan.requirements.find(
      (r) => r.courseGroup.id === courseGroupId
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
              data: originalGroup.links.map((l) => ({
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

    // Group not found in plan requirements — shouldn't normally happen
    return null;
  }

  return null;
}

/**
 * POST /api/users/[id]/degree/courses
 * Body: { courseGroupId: number, courseCode: string }
 *
 * Adds a course to a requirement group with copy-on-write.
 * Creates a plan if the user is on a template.
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
 *
 * Removes a course from a requirement group with copy-on-write.
 * Creates a plan if the user is on a template.
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
