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
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      requirements: {
        include: {
          courseGroup: {
            include: {
              links: { include: { course: true } },
            },
          },
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const body = await request.json();
  const { name } = body;

  const template = await prisma.template.update({
    where: { id },
    data: { ...(name && { name }) },
  });

  return NextResponse.json(template);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const id = await parseId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  await prisma.template.delete({ where: { id } });

  return NextResponse.json({ deleted: id });
}
