import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { monthlySummary, type MonthlySummary } from "../../../dashboard/data/monthlySummary";
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ monthkey: string }> }
) {
  const { monthkey } = await context.params;

  const selected = monthlySummary.find(
    (m: MonthlySummary) => m.monthKey === monthkey
  );

  if (!selected) {
    return NextResponse.json(
      { error: `No spreadsheet data found for ${monthkey}` },
      { status: 404 }
    );
  }

  const revenueBySource = [
    { source: "PAYPAL", amount: selected.revenueSources.paypal },
    { source: "STRIPE", amount: selected.revenueSources.stripe },
    { source: "SUBSTACK", amount: selected.revenueSources.substack },
    { source: "YOUTUBE", amount: selected.revenueSources.youtube },
    { source: "PAYMENTS_AI", amount: selected.revenueSources.paymentsAi },
  ].filter((r) => r.amount > 0);

  const expenseBreakdown = [
    { category: "Software", amount: selected.expenseBreakdown.software },
    { category: "Contractors", amount: selected.expenseBreakdown.contractors },
    { category: "Rent", amount: selected.expenseBreakdown.rent },
    { category: "Fees", amount: Math.abs(selected.expenseBreakdown.fees) },
    { category: "Other", amount: selected.expenseBreakdown.other },
  ].filter((e) => Math.abs(e.amount) > 0);

  const monthlyTrend = monthlySummary.map((m: MonthlySummary) => ({
    month: m.monthKey,
    revenue: m.grossRevenue,
    expenses: m.expenses,
    profit: m.netProfit,
  }));

  const transactions = revenueBySource.map((r, i) => ({
    id: `rev-${i}`,
    date: `${selected.monthKey}-01`,
    description: `${r.source} revenue`,
    source: r.source,
    type: "INCOME",
    amount: r.amount,
    category: "Revenue",
  }));

  expenseBreakdown.forEach((e, i) => {
    transactions.push({
      id: `exp-${i}`,
      date: `${selected.monthKey}-01`,
      description: `${e.category} expense`,
      source: "SHEET",
      type: "EXPENSE",
      amount: -Math.abs(e.amount),
      category: e.category,
    });
  });

  return NextResponse.json({
    monthKey: selected.monthKey,
    kpis: {
      grossRevenue: selected.grossRevenue,
      refunds: 0,
      fees: selected.fees,
      netRevenue: selected.netRevenue,
      expenses: selected.expenses,
      netProfit: selected.netProfit,
      profitMargin: selected.profitMargin,
    },
    revenueBySource,
    expenseBreakdown,
    monthlyTrend,
    transactions,
  });
}