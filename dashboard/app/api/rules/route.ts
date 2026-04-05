import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rules — list all rules
export async function GET() {
  const rules = await prisma.categorizationRule.findMany({
    orderBy: [{ priority: "asc" }, { matchValue: "asc" }],
  });
  return NextResponse.json({ rules });
}

// POST /api/rules — create a new rule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rule = await prisma.categorizationRule.create({
      data: {
        priority: body.priority || 50,
        sourceSystem: body.sourceSystem || null,
        matchField: body.matchField || "description",
        matchType: body.matchType || "contains",
        matchValue: body.matchValue,
        category: body.category,
        subcategory: body.subcategory || null,
        subtype: body.subtype || null,
        txType: body.txType || null,
        isIgnored: body.isIgnored || false,
        isOneTime: body.isOneTime || false,
        isBusinessRelevant: body.isBusinessRelevant !== false,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ success: true, rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create rule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/rules?id=xxx — delete a rule
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Rule ID required" }, { status: 400 });

  await prisma.categorizationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
