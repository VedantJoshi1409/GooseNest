import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) return null;
  return parsed;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid requirement ID" }, { status: 400 });
  }

  const body = await request.json();
  const { name, amount, courseGroupId } = body;

  const requirement = await prisma.requirement.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(amount && { amount }),
      ...(courseGroupId && { courseGroupId }),
    },
  });

  return NextResponse.json(requirement);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid requirement ID" }, { status: 400 });
  }

  await prisma.requirement.delete({ where: { id } });

  return NextResponse.json({ deleted: id });
}
