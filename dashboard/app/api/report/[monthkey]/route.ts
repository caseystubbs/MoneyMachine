import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: { monthKey: string } }
) {
  const monthKey = params.monthKey;

  const txns = await prisma.transaction.findMany({
    where: { monthKey },
    select: { amount: true, type: true, categoryId: true, category: { select: { name: true } } },
  });

  // Helpers
  const sumByType = (t: TransactionType) =>
    txns
      .filter((x) => x.type === t)
      .reduce((acc, x) => acc + Number(x.amount), 0);

  const grossSales = sumByType(TransactionType.INCOME);
  const refunds = sumByType(TransactionType.REFUND);
  const fees = sumByType(TransactionType.FEE);
  const expenses = sumByType(TransactionType.EXPENSE);

  const netRevenue = grossSales + refunds + fees; // refunds/fees usually stored as negative
  const totalCosts = expenses; // expenses usually negative too (we’ll display absolute)
  const netProfit = netRevenue + totalCosts;

  // Cost summary by category
  const costsByCategoryMap = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== TransactionType.EXPENSE) continue;
    const name = t.category?.name ?? "Uncategorized";
    costsByCategoryMap.set(name, (costsByCategoryMap.get(name) ?? 0) + Number(t.amount));
  }

  const costSummary = Array.from(costsByCategoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return NextResponse.json({
    monthKey,
    kpis: {
      grossSales,
      refunds,
      fees,
      netRevenue,
      totalCosts,
      netProfit,
      profitMargin: netRevenue !== 0 ? netProfit / netRevenue : 0,
    },
    costSummary,
  });
}