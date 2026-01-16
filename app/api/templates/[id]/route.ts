import { getTemplateWithRequirements } from "@/lib/templates";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json(
      { error: "Invalid template ID" },
      { status: 400 }
    );
  }

  const template = await getTemplateWithRequirements(templateId);

  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}
