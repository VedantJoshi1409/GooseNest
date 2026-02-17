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
 * PATCH /api/users/[id]/degree/requirements/[reqId]
 * Body: { forceCompleted: boolean }
 *
 * Toggles force-complete on a plan requirement.
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

  const updated = await prisma.planRequirement.update({
    where: { id: requirementId, planId: user.plan.id },
    data: { forceCompleted },
  });

  return NextResponse.json({ planRequirement: updated, planId: user.plan.id });
}
