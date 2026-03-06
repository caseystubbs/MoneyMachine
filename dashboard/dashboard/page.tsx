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
    currency: "USD"
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
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`/api/report/${monthKey}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((data) => setReport(data))
      .catch((e) => setError(String(e?.message ?? e)))
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
      { label: "Profit Margin", value: `${(k.profitMargin * 100).toFixed(1)}%` }
    ];
  }, [report]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>MoneyMachine — Monthly Dashboard</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Month</span>
          <input
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            placeholder="YYYY-MM"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "inherit"
            }}
          />
        </div>
      </div>

      <div style={{ height: 16 }} />

      {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
      {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}

      {!loading && !error && !report && (
        <div style={{ opacity: 0.8 }}>
          No data yet for {monthKey}. Next step: import transactions.
        </div>
      )}

      {report && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            {tiles.map((t) => (
              <div
                key={t.label}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: 14
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>{t.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{t.value}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 16 }} />

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: 14
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Cost Summary</div>

            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead style={{ opacity: 0.7 }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 0" }}>Category</th>
                  <th style={{ textAlign: "right", padding: "10px 0" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.costSummary.map((c) => (
                  <tr key={c.name} style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                    <td style={{ padding: "10px 0" }}>{c.name}</td>
                    <td style={{ padding: "10px 0", textAlign: "right" }}>{fmtMoney(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}