import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/transactions?monthKey=2026-03&type=EXPENSE&uncategorized=true&ignored=false
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const monthKey = params.get("monthKey");
  const type = params.get("type");
  const source = params.get("source");
  const uncategorized = params.get("uncategorized") === "true";
  const ignored = params.get("ignored");
  const limit = parseInt(params.get("limit") || "200");
  const offset = parseInt(params.get("offset") || "0");

  const where: any = {};
  if (monthKey) where.monthKey = monthKey;
  if (type) where.type = type;
  if (source) where.source = source;
  if (uncategorized) where.subcategory = null;
  if (ignored === "true") where.isIgnored = true;
  if (ignored === "false") where.isIgnored = false;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      include: { category: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      amount: Number(t.amount),
      description: t.description,
      vendor: t.vendor,
      source: t.source,
      type: t.type,
      monthKey: t.monthKey,
      subcategory: t.subcategory,
      subtype: t.subtype,
      isIgnored: t.isIgnored,
      isOneTime: t.isOneTime,
      isBusinessRelevant: t.isBusinessRelevant,
      manualOverride: t.manualOverride,
      ruleIdApplied: t.ruleIdApplied,
      category: t.category?.name || null,
    })),
    total,
    limit,
    offset,
  });
}

// PATCH /api/transactions — update a single transaction
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, subcategory, subtype, type, isIgnored, isOneTime, isBusinessRelevant, createRule } = body;

    if (!id) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Update the transaction
    const update: any = { manualOverride: true, updatedAt: new Date() };
    if (subcategory !== undefined) update.subcategory = subcategory;
    if (subtype !== undefined) update.subtype = subtype;
    if (type !== undefined) update.type = type;
    if (isIgnored !== undefined) update.isIgnored = isIgnored;
    if (isOneTime !== undefined) update.isOneTime = isOneTime;
    if (isBusinessRelevant !== undefined) update.isBusinessRelevant = isBusinessRelevant;

    const updated = await prisma.transaction.update({ where: { id }, data: update });

    // Optionally create a new rule from this correction
    if (createRule && subcategory) {
      const matchValue = tx.vendor || tx.description.split(" ").slice(0, 3).join(" ");
      await prisma.categorizationRule.create({
        data: {
          priority: 50,
          sourceSystem: null,
          matchField: "description",
          matchType: "contains",
          matchValue,
          category: subcategory.includes("/") ? subcategory.split("/")[0] : subcategory,
          subcategory,
          subtype: subtype || null,
          txType: type || null,
          isIgnored: isIgnored || false,
          isOneTime: isOneTime || false,
          isBusinessRelevant: isBusinessRelevant !== false,
        },
      });
    }

    return NextResponse.json({ success: true, transaction: { id: updated.id, subcategory: updated.subcategory, subtype: updated.subtype } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
