import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

export async function GET(request: NextRequest, { params }: Params) {
  const templateId = await parseId(params);
  if (!templateId) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const requirements = await prisma.requirement.findMany({
    where: { templateId },
    include: {
      courseGroup: {
        include: { links: { include: { course: true } } },
      },
    },
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

  if (!name || !amount || !courseGroupId) {
    return NextResponse.json(
      { error: "name, amount, and courseGroupId are required" },
      { status: 400 }
    );
  }

  const requirement = await prisma.requirement.create({
    data: { name, amount, courseGroupId, templateId },
    include: {
      courseGroup: {
        include: { links: { include: { course: true } } },
      },
    },
  });

  return NextResponse.json(requirement, { status: 201 });
}
