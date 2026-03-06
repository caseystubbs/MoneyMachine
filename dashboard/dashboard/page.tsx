"use client";

import { useEffect, useMemo, useState } from "react";

type Report = {
  monthKey: string;
  kpis: {
    grossSales: number;
    refunds: number;
    fees: number;
    netRevenue: number;
    totalCosts: number;
    netProfit: number;
    profitMargin: number;
  };
  costSummary: { name: string; amount: number }[];
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const [monthKey, setMonthKey] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/report/${monthKey}`)
      .then((r) => r.json())
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, [monthKey]);

  const tiles = useMemo(() => {
    if (!report) return [];
    const k = report.kpis;
    return [
      { label: "Gross Sales", value: fmtMoney(k.grossSales) },
      { label: "Refunds", value: fmtMoney(k.refunds) },
      { label: "Fees", value: fmtMoney(k.fees) },
      { label: "Net Revenue", value: fmtMoney(k.netRevenue) },
      { label: "Total Costs", value: fmtMoney(k.totalCosts) },
      { label: "Net Profit", value: fmtMoney(k.netProfit) },
      { label: "Profit Margin", value: `${(k.profitMargin * 100).toFixed(1)}%` },
    ];
  }, [report]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">MoneyMachine — Monthly Dashboard</h1>

        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Month</label>
          <input
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="border rounded px-3 py-2 bg-transparent"
            placeholder="YYYY-MM"
          />
        </div>
      </div>

      {loading && <div className="opacity-70">Loading…</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border p-4">
                <div className="text-sm opacity-70">{t.label}</div>
                <div className="text-xl font-semibold mt-1">{t.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-lg font-semibold mb-3">Cost Summary</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="opacity-70">
                  <tr>
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.costSummary.map((c) => (
                    <tr key={c.name} className="border-t">
                      <td className="py-2">{c.name}</td>
                      <td className="py-2 text-right">{fmtMoney(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !report && (
        <div className="opacity-70">
          No data yet for {monthKey}. Next step: import transactions.
        </div>
      )}
    </div>
  );
}