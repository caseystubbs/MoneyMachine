import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import type { NextRequest } from "next/server";

function monthKeyToRange(monthKey: string) {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { start, end };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ monthkey: string }> }
) {
  const { monthkey } = await context.params;
  const { start, end } = monthKeyToRange(monthkey);

  const txns = await prisma.transaction.findMany({
    where: {
      monthKey: monthkey,
    },
    orderBy: {
      date: "asc",
    },
    select: {
      id: true,
      date: true,
      amount: true,
      description: true,
      vendor: true,
      currency: true,
      type: true,
      source: true,
      businessUnit: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const trendTxns = await prisma.transaction.findMany({
    where: {
      date: {
        gte: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 5, 1)),
        lt: end,
      },
    },
    orderBy: {
      date: "asc",
    },
    select: {
      date: true,
      amount: true,
      type: true,
      monthKey: true,
    },
  });

  const sumByType = (t: TransactionType) =>
    txns
      .filter((x) => x.type === t)
      .reduce((acc, x) => acc + Number(x.amount), 0);

  const grossRevenue = sumByType(TransactionType.INCOME);
  const refunds = sumByType(TransactionType.REFUND);
  const fees = sumByType(TransactionType.FEE);
  const expenses = sumByType(TransactionType.EXPENSE);

  const netRevenue = grossRevenue + refunds + fees;
  const netProfit = netRevenue + expenses;
  const profitMargin = netRevenue !== 0 ? netProfit / netRevenue : 0;

  // Revenue by source/platform
  const revenueBySourceMap = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== TransactionType.INCOME) continue;
    const key = t.source || "OTHER";
    revenueBySourceMap.set(key, (revenueBySourceMap.get(key) ?? 0) + Number(t.amount));
  }

  const revenueBySource = Array.from(revenueBySourceMap.entries()).map(
    ([source, amount]) => ({
      source,
      amount,
    })
  );

  // Expense breakdown
  const expenseByCategoryMap = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== TransactionType.EXPENSE && t.type !== TransactionType.FEE) continue;
    const key =
      t.type === TransactionType.FEE
        ? "Fees"
        : t.category?.name || "Uncategorized";

    expenseByCategoryMap.set(key, (expenseByCategoryMap.get(key) ?? 0) + Math.abs(Number(t.amount)));
  }

  const expenseBreakdown = Array.from(expenseByCategoryMap.entries()).map(
    ([category, amount]) => ({
      category,
      amount,
    })
  );

  // Monthly trends (last 6 months available up to selected month)
  const monthMap = new Map<
    string,
    { month: string; revenue: number; expenses: number; profit: number }
  >();

  for (const t of trendTxns) {
    const mk = t.monthKey;
    const current = monthMap.get(mk) ?? {
      month: mk,
      revenue: 0,
      expenses: 0,
      profit: 0,
    };

    const amt = Number(t.amount);

    if (t.type === TransactionType.INCOME) {
      current.revenue += amt;
    }

    if (
      t.type === TransactionType.REFUND ||
      t.type === TransactionType.FEE ||
      t.type === TransactionType.EXPENSE
    ) {
      current.expenses += Math.abs(amt);
    }

    monthMap.set(mk, current);
  }

  const monthlyTrend = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      profit: m.revenue - m.expenses,
    }));

  const transactions = txns.map((t) => ({
    id: t.id,
    date: t.date,
    description: t.description,
    source: t.source,
    type: t.type,
    amount: Number(t.amount),
    category: t.category?.name || null,
  }));

  return NextResponse.json({
    monthKey: monthkey,
    kpis: {
      grossRevenue,
      refunds,
      fees,
      netRevenue,
      expenses: Math.abs(expenses),
      netProfit,
      profitMargin,
    },
    revenueBySource,
    expenseBreakdown,
    monthlyTrend,
    transactions,
  });
}