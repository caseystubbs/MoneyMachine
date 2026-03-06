import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ monthkey: string }> }
) {
  const { monthkey } = await context.params;

  const txns = await prisma.transaction.findMany({
    where: { monthKey: monthkey },
    select: {
      amount: true,
      type: true,
      category: { select: { name: true } }
    }
  });

  const sumByType = (t: TransactionType) =>
    txns
      .filter((x) => x.type === t)
      .reduce((acc, x) => acc + Number(x.amount), 0);

  // With your convention:
  // INCOME positive
  // REFUND/FEE/EXPENSE negative
  const grossSales = sumByType(TransactionType.INCOME);
  const refunds = sumByType(TransactionType.REFUND);
  const fees = sumByType(TransactionType.FEE);
  const expenses = sumByType(TransactionType.EXPENSE);

  const netRevenue = grossSales + refunds + fees;
  const totalCosts = expenses;
  const netProfit = netRevenue + totalCosts;

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
    monthKey: monthkey,
    kpis: {
      grossSales,
      refunds,
      fees,
      netRevenue,
      totalCosts,
      netProfit,
      profitMargin: netRevenue !== 0 ? netProfit / netRevenue : 0
    },
    costSummary
  });
}