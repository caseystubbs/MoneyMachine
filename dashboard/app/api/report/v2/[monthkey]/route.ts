import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function toNumber(val: Prisma.Decimal | null): number {
  if (!val) return 0;
  return Number(val);
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ monthkey: string }> }
) {
  const { monthkey } = await context.params;

  try {
    // --- Get all months that have data ---
    const allMonths = await prisma.transaction.findMany({
      select: { monthKey: true },
      distinct: ["monthKey"],
      orderBy: { monthKey: "desc" },
    });

    const availableMonths = allMonths.map((m) => {
      const [year, month] = m.monthKey.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        label: date.toLocaleString("en-US", { month: "long", year: "numeric" }),
        value: m.monthKey,
      };
    });

    if (availableMonths.length === 0) {
      return NextResponse.json(
        { error: "No transaction data found. Run a sync first." },
        { status: 404 }
      );
    }

    // If requested month doesn't exist, fall back to most recent
    const targetMonth = availableMonths.find((m) => m.value === monthkey)
      ? monthkey
      : availableMonths[0].value;

    // --- Fetch transactions for the selected month ---
    const monthTxns = await prisma.transaction.findMany({
      where: { monthKey: targetMonth },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    // --- Compute KPIs ---
    let grossRevenue = 0;
    let refunds = 0;
    let fees = 0;
    let expenses = 0;

    const revenueBySource: Record<string, number> = {};
    const expenseByCategory: Record<string, { amount: number; details: { label: string; amount: number }[] }> = {};
    const revenueBySubtype: Record<string, number> = {};
    let ignoredTotal = 0;
    let oneTimeTotal = 0;

    for (const tx of monthTxns) {
      const amt = toNumber(tx.amount as any);

      // Skip ignored transactions from P&L
      if ((tx as any).isIgnored) {
        ignoredTotal += Math.abs(amt);
        continue;
      }

      switch (tx.type) {
        case "INCOME":
          grossRevenue += amt;
          revenueBySource[tx.source] = (revenueBySource[tx.source] || 0) + amt;
          // Track by subtype if available
          const subtype = (tx as any).subtype || (tx as any).subcategory || "Other";
          revenueBySubtype[subtype] = (revenueBySubtype[subtype] || 0) + amt;
          break;
        case "REFUND":
          refunds += Math.abs(amt);
          break;
        case "FEE":
          fees += Math.abs(amt);
          break;
        case "EXPENSE":
          const expAmt = Math.abs(amt);
          if ((tx as any).isOneTime) {
            oneTimeTotal += expAmt;
          }
          expenses += expAmt;
          const cat = (tx as any).subcategory || tx.category?.name || "Uncategorized";
          if (!expenseByCategory[cat]) {
            expenseByCategory[cat] = { amount: 0, details: [] };
          }
          expenseByCategory[cat].amount += expAmt;
          expenseByCategory[cat].details.push({
            label: tx.description,
            amount: expAmt,
          });
          break;
      }
    }

    const netRevenue = grossRevenue - refunds - fees;
    const operatingExpenses = expenses - oneTimeTotal;
    const netProfit = netRevenue - expenses;
    const netProfitBeforeOneTime = netRevenue - operatingExpenses;
    const profitMargin = grossRevenue > 0 ? netProfit / grossRevenue : 0;

    // --- Revenue by source ---
    const revenueBySourceArr = Object.entries(revenueBySource)
      .map(([source, amount]) => ({ source, amount }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    // --- Revenue by subtype ---
    const revenueBySubtypeArr = Object.entries(revenueBySubtype)
      .map(([subtype, amount]) => ({ subtype, amount }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    // --- Expense breakdown ---
    const expenseBreakdown = Object.entries(expenseByCategory)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        details: data.details.sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.amount - a.amount);

    // --- Monthly trend (all months) ---
    const allTxns = await prisma.transaction.findMany({
      select: { monthKey: true, type: true, amount: true },
      orderBy: { monthKey: "asc" },
    });

    const trendMap: Record<string, { revenue: number; expenses: number; fees: number; refunds: number }> = {};

    for (const tx of allTxns) {
      const mk = tx.monthKey;
      if (!trendMap[mk]) trendMap[mk] = { revenue: 0, expenses: 0, fees: 0, refunds: 0 };
      const amt = toNumber(tx.amount as any);

      switch (tx.type) {
        case "INCOME":
          trendMap[mk].revenue += amt;
          break;
        case "EXPENSE":
          trendMap[mk].expenses += Math.abs(amt);
          break;
        case "FEE":
          trendMap[mk].fees += Math.abs(amt);
          break;
        case "REFUND":
          trendMap[mk].refunds += Math.abs(amt);
          break;
      }
    }

    const monthlyTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses + data.fees,
        profit: data.revenue - data.expenses - data.fees - data.refunds,
      }));

    // --- TTM (Trailing Twelve Months) ---
    const ttmMonths = monthlyTrend.slice(-12);
    const ttmRevenue = ttmMonths.reduce((sum, m) => sum + m.revenue, 0);
    const ttmExpenses = ttmMonths.reduce((sum, m) => sum + m.expenses, 0);
    const ttmProfit = ttmMonths.reduce((sum, m) => sum + m.profit, 0);
    const ttmMargin = ttmRevenue > 0 ? ttmProfit / ttmRevenue : 0;

    // --- MoM growth ---
    const currentIdx = monthlyTrend.findIndex((m) => m.month === targetMonth);
    const currentRevenue = currentIdx >= 0 ? monthlyTrend[currentIdx].revenue : 0;
    const prevRevenue = currentIdx > 0 ? monthlyTrend[currentIdx - 1].revenue : 0;
    const momGrowth = prevRevenue > 0 ? (currentRevenue - prevRevenue) / prevRevenue : 0;

    // --- Cash position (from Plaid accounts) ---
    const plaidAccounts = await prisma.plaidAccount.findMany({
      include: { plaidItem: { select: { institutionName: true } } },
    });

    const cashAccounts = plaidAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      institution: a.plaidItem.institutionName || "Unknown",
      type: a.type,
      currentBalance: toNumber(a.currentBalance as any),
      availableBalance: toNumber(a.availableBalance as any),
      lastUpdated: a.balanceUpdatedAt?.toISOString() || null,
    }));

    const totalCash = cashAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

    // --- Last sync info ---
    const lastSyncs = await prisma.syncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // --- Transactions list ---
    const transactions = monthTxns.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description,
      vendor: t.vendor,
      source: t.source,
      type: t.type,
      amount: toNumber(t.amount as any),
      category: t.category?.name || null,
    }));

    return NextResponse.json({
      monthKey: targetMonth,
      availableMonths,
      kpis: {
        grossRevenue,
        refunds,
        fees,
        netRevenue,
        expenses,
        operatingExpenses,
        oneTimeExpenses: oneTimeTotal,
        ignoredTotal,
        netProfit,
        netProfitBeforeOneTime,
        profitMargin,
      },
      ttm: {
        revenue: ttmRevenue,
        expenses: ttmExpenses,
        profit: ttmProfit,
        margin: ttmMargin,
        months: ttmMonths.length,
      },
      momGrowth,
      cashPosition: {
        total: totalCash,
        accounts: cashAccounts,
      },
      revenueBySource: revenueBySourceArr,
      revenueBySubtype: revenueBySubtypeArr,
      expenseBreakdown,
      monthlyTrend,
      transactions,
      lastSyncs: lastSyncs.map((s) => ({
        source: s.source,
        status: s.status,
        txAdded: s.txAdded,
        txUpdated: s.txUpdated,
        duration: s.duration,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
