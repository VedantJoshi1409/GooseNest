import { getAllTemplates } from "@/lib/templates";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: {}) {
  const templates = await getAllTemplates();

  if (!templates) {
    return NextResponse.json({ error: "Templates not found" }, { status: 404 });
  }

  return NextResponse.json(templates);
}
