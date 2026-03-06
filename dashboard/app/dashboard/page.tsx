"use client";

import { useEffect, useMemo, useState } from "react";

type Report = {
  monthKey: string;
  kpis: {
    grossRevenue: number;
    refunds: number;
    fees: number;
    netRevenue: number;
    expenses: number;
    netProfit: number;
    profitMargin: number;
  };
  revenueBySource: { source: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
  monthlyTrend: { month: string; revenue: number; expenses: number; profit: number }[];
  transactions: {
    id: string;
    date: string;
    description: string;
    source: string;
    type: string;
    amount: number;
    category: string | null;
  }[];
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    STRIPE: "Stripe",
    PAYPAL: "PayPal",
    SUBSTACK: "Substack",
    YOUTUBE: "YouTube",
    MANUAL: "Manual",
    AMEX: "Amex",
  };

  return map[source] || source;
}

function cardStyle(): React.CSSProperties {
  return {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  };
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

  const kpiCards = useMemo(() => {
    if (!report) return [];

    return [
      { label: "Gross Revenue", value: fmtMoney(report.kpis.grossRevenue) },
      { label: "Refunds", value: fmtMoney(report.kpis.refunds) },
      { label: "Processing Fees", value: fmtMoney(report.kpis.fees) },
      { label: "Net Revenue", value: fmtMoney(report.kpis.netRevenue) },
      { label: "Expenses", value: fmtMoney(report.kpis.expenses) },
      { label: "Net Profit", value: fmtMoney(report.kpis.netProfit) },
      { label: "Profit Margin", value: fmtPct(report.kpis.profitMargin) },
    ];
  }, [report]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0b1020 0%, #111827 100%)",
        color: "#f8fafc",
        padding: "32px 20px 48px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#a78bfa",
                marginBottom: 8,
              }}
            >
              MoneyMachine
            </div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>
              Financial Dashboard
            </h1>
            <p style={{ marginTop: 8, color: "#94a3b8" }}>
              Revenue, expenses, and profit for your business.
            </p>
          </div>

          <div>
            <input
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              placeholder="YYYY-MM"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.2)",
                background: "rgba(255,255,255,0.04)",
                color: "#f8fafc",
              }}
            />
          </div>
        </div>

        {loading && (
          <div style={{ color: "#94a3b8", marginBottom: 20 }}>Loading dashboard…</div>
        )}

        {report && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {kpiCards.map((card) => (
                <div key={card.label} style={cardStyle()}>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{card.value}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginBottom: 20,
              }}
            >
              <div style={cardStyle()}>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Revenue by Platform</h2>
                <p style={{ color: "#94a3b8", marginTop: 0 }}>
                  PayPal, Stripe, Substack, YouTube, and other sources
                </p>

                <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                      <th style={{ padding: "10px 8px" }}>Source</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.revenueBySource.map((r) => (
                      <tr
                        key={r.source}
                        style={{ borderTop: "1px solid rgba(148,163,184,0.10)" }}
                      >
                        <td style={{ padding: "10px 8px" }}>{sourceLabel(r.source)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>
                          {fmtMoney(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={cardStyle()}>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>Expense Breakdown</h2>
                <p style={{ color: "#94a3b8", marginTop: 0 }}>
                  Software, contractors, rent, fees, and other costs
                </p>

                <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                      <th style={{ padding: "10px 8px" }}>Category</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenseBreakdown.map((e) => (
                      <tr
                        key={e.category}
                        style={{ borderTop: "1px solid rgba(148,163,184,0.10)" }}
                      >
                        <td style={{ padding: "10px 8px" }}>{e.category}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>
                          {fmtMoney(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ ...cardStyle(), marginBottom: 20 }}>
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Monthly Trend</h2>
              <p style={{ color: "#94a3b8", marginTop: 0 }}>
                Revenue, expenses, and profit by month
              </p>

              <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px" }}>Month</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Revenue</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Expenses</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlyTrend.map((m) => (
                    <tr
                      key={m.month}
                      style={{ borderTop: "1px solid rgba(148,163,184,0.10)" }}
                    >
                      <td style={{ padding: "10px 8px" }}>{m.month}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right" }}>
                        {fmtMoney(m.revenue)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "right" }}>
                        {fmtMoney(m.expenses)}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: m.profit < 0 ? "#fca5a5" : "#86efac",
                        }}
                      >
                        {fmtMoney(m.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Transactions</h2>
              <p style={{ color: "#94a3b8", marginTop: 0 }}>
                Detailed records for the selected month
              </p>

              <div style={{ overflowX: "auto", marginTop: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                      <th style={{ padding: "12px 8px" }}>Date</th>
                      <th style={{ padding: "12px 8px" }}>Source</th>
                      <th style={{ padding: "12px 8px" }}>Description</th>
                      <th style={{ padding: "12px 8px" }}>Category</th>
                      <th style={{ padding: "12px 8px" }}>Type</th>
                      <th style={{ padding: "12px 8px", textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.map((t) => (
                      <tr
                        key={t.id}
                        style={{ borderTop: "1px solid rgba(148,163,184,0.10)" }}
                      >
                        <td style={{ padding: "12px 8px" }}>
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 8px" }}>{sourceLabel(t.source)}</td>
                        <td style={{ padding: "12px 8px" }}>{t.description}</td>
                        <td style={{ padding: "12px 8px" }}>{t.category || "—"}</td>
                        <td style={{ padding: "12px 8px" }}>{t.type}</td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "right",
                            color: t.amount < 0 ? "#fca5a5" : "#86efac",
                            fontWeight: 700,
                          }}
                        >
                          {fmtMoney(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}