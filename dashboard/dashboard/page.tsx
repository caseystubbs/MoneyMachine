"use client";

import { useEffect, useState } from "react";

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
    currency: "USD"
  }).format(n);
}

export default function DashboardPage() {
  const [monthKey, setMonthKey] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setError("");

    fetch(`/api/report/${monthKey}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((data: Report) => setReport(data))
      .catch((e: unknown) => {
        setReport(null);
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [monthKey]);

  if (!report) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>MoneyMachine Dashboard</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>No data yet for {monthKey}</p>
        {error && <p style={{ marginTop: 12, color: "#ff6b6b" }}>{error}</p>}
      </div>
    );
  }

  const k = report.kpis;

  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        MoneyMachine Monthly Dashboard
      </h1>

      <div style={{ marginTop: 20 }}>
        <input
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
          placeholder="YYYY-MM"
          style={{ padding: 10 }}
        />
      </div>

      <div style={{ marginTop: 30 }}>
        <h2 style={{ marginBottom: 10 }}>KPI</h2>
        <p>Gross Sales: {fmtMoney(k.grossSales)}</p>
        <p>Refunds: {fmtMoney(k.refunds)}</p>
        <p>Fees: {fmtMoney(k.fees)}</p>
        <p>Net Revenue: {fmtMoney(k.netRevenue)}</p>
        <p>Total Costs: {fmtMoney(k.totalCosts)}</p>
        <p>Net Profit: {fmtMoney(k.netProfit)}</p>
      </div>

      <div style={{ marginTop: 30 }}>
        <h2 style={{ marginBottom: 10 }}>Cost Summary</h2>

        <table style={{ width: "100%", marginTop: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Category</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>

          <tbody>
            {report.costSummary.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td style={{ textAlign: "right" }}>{fmtMoney(c.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}