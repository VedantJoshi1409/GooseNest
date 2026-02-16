import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

const courseGroupInclude = {
  include: { links: { include: { course: true } } },
} as const;

function requirementInclude(depth: number): any {
  const base: any = {
    include: {
      courseGroup: courseGroupInclude,
    },
  };
  if (depth > 0) {
    base.include.children = requirementInclude(depth - 1);
  } else {
    base.include.children = true;
  }
  return base;
}

export async function GET(request: NextRequest, { params }: Params) {
  const templateId = await parseId(params);
  if (!templateId) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const requirements = await prisma.requirement.findMany({
    where: { templateId, parentId: null },
    ...requirementInclude(4),
  });

  return NextResponse.json(requirements);
}

export async function POST(request: NextRequest, { params }: Params) {
  const templateId = await parseId(params);
  if (!templateId) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const body = await request.json();
  const { name, amount, courseGroupId } = body;

  if (!name || !amount) {
    return NextResponse.json(
      { error: "name and amount are required" },
      { status: 400 }
    );
  }

  const requirement = await prisma.requirement.create({
    data: { name, amount, courseGroupId: courseGroupId || null, templateId },
    include: {
      courseGroup: courseGroupInclude,
    },
  });

  return NextResponse.json(requirement, { status: 201 });
}
