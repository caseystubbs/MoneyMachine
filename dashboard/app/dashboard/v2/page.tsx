"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────── */

type DetailItem = { label: string; amount: number };

type Report = {
  monthKey: string;
  availableMonths: { label: string; value: string }[];
  kpis: {
    grossRevenue: number;
    refunds: number;
    fees: number;
    netRevenue: number;
    expenses: number;
    netProfit: number;
    profitMargin: number;
  };
  ttm: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    months: number;
  };
  momGrowth: number;
  cashPosition: {
    total: number;
    accounts: {
      id: string;
      name: string;
      institution: string;
      type: string;
      currentBalance: number;
      availableBalance: number;
      lastUpdated: string | null;
    }[];
  };
  revenueBySource: { source: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number; details: DetailItem[] }[];
  monthlyTrend: { month: string; revenue: number; expenses: number; profit: number }[];
  transactions: {
    id: string;
    date: string;
    description: string;
    vendor: string | null;
    source: string;
    type: string;
    amount: number;
    category: string | null;
  }[];
  lastSyncs: {
    source: string;
    status: string;
    txAdded: number;
    txUpdated: number;
    duration: number | null;
    createdAt: string;
  }[];
};

/* ─── Formatters ────────────────────────────────────────── */

function fmtMoney(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function sourceLabel(source: string) {
  const map: Record<string, { label: string; color: string }> = {
    STRIPE: { label: "Stripe", color: "#635bff" },
    PAYPAL: { label: "PayPal", color: "#0070ba" },
    PLAID: { label: "Bank", color: "#10b981" },
    YOUTUBE: { label: "YouTube", color: "#ff0000" },
    SUBSTACK: { label: "Substack", color: "#ff6719" },
    PAYMENTS_AI: { label: "Payments AI", color: "#8b5cf6" },
    AMEX: { label: "Amex", color: "#006fcf" },
    MANUAL: { label: "Manual", color: "#94a3b8" },
    SHEET: { label: "Sheet", color: "#94a3b8" },
  };
  return map[source] || { label: source, color: "#94a3b8" };
}

function timeAgo(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─── Styles ────────────────────────────────────────────── */

const NAVY = "#0B1120";
const GREEN = "#10B981";
const BLUE = "#2563EB";
const DARK_CARD = "rgba(11, 17, 32, 0.92)";
const BORDER = "rgba(37, 99, 235, 0.12)";
const BORDER_HOVER = "rgba(16, 185, 129, 0.25)";
const TEXT_DIM = "#64748b";
const TEXT_MID = "#94a3b8";
const TEXT_BRIGHT = "#e2e8f0";

/* ─── Component ─────────────────────────────────────────── */

export default function DashboardV2() {
  const [monthKey, setMonthKey] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [drillCategory, setDrillCategory] = useState<{
    name: string;
    amount: number;
    details: DetailItem[];
  } | null>(null);
  const [txFilter, setTxFilter] = useState<"ALL" | "INCOME" | "EXPENSE" | "FEE" | "REFUND">("ALL");

  const fetchReport = useCallback((mk: string) => {
    setLoading(true);
    setError("");
    fetch(`/api/report/v2/${mk}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        return data;
      })
      .then((data) => {
        setReport(data);
        setMonthKey(data.monthKey);
        setDrillCategory(null);
      })
      .catch((err) => {
        setReport(null);
        setError(err instanceof Error ? err.message : "Dashboard error");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Load with current month by default
    const now = new Date();
    const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    fetchReport(mk);
  }, [fetchReport]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync/all", { method: "POST" });
      const data = await res.json();
      const total =
        Object.values(data.results || {}).reduce(
          (sum: number, r: any) => sum + (r.txAdded || 0),
          0
        );
      setSyncResult(`Synced ${total} new transactions`);
      // Refresh dashboard
      fetchReport(monthKey);
    } catch {
      setSyncResult("Sync failed — check console");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  }

  const filteredTxns = useMemo(() => {
    if (!report) return [];
    if (txFilter === "ALL") return report.transactions;
    return report.transactions.filter((t) => t.type === txFilter);
  }, [report, txFilter]);

  // --- Revenue bar chart (simple CSS bars) ---
  const maxTrendRevenue = useMemo(() => {
    if (!report) return 1;
    return Math.max(...report.monthlyTrend.map((m) => m.revenue), 1);
  }, [report]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(170deg, ${NAVY} 0%, #0d1528 40%, #0f172a 100%)`,
        color: TEXT_BRIGHT,
        fontFamily:
          '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ─── Top Bar ─────────────────────────────────────── */}
      <div
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(11, 17, 32, 0.6)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 14,
                color: "white",
              }}
            >
              M
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>
                MoneyMachine
              </div>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 500 }}>
                Freedom Income Options
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <select
              value={monthKey}
              onChange={(e) => {
                setMonthKey(e.target.value);
                fetchReport(e.target.value);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                background: "rgba(255,255,255,0.04)",
                color: TEXT_BRIGHT,
                fontSize: 13,
                fontWeight: 600,
                minWidth: 180,
              }}
            >
              {report?.availableMonths?.map((m) => (
                <option key={m.value} value={m.value} style={{ color: "#111" }}>
                  {m.label}
                </option>
              )) || (
                <option value={monthKey} style={{ color: "#111" }}>
                  {monthKey}
                </option>
              )}
            </select>

            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: syncing ? TEXT_DIM : GREEN,
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                cursor: syncing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ display: "inline-block", transform: syncing ? "none" : "none" }}>
                {syncing ? "⟳" : "↻"}
              </span>
              {syncing ? "Syncing..." : "Sync All"}
            </button>

            {syncResult && (
              <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>
                {syncResult}
              </span>
            )}

            <a
              href="/connect"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: TEXT_MID,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              + Connect Bank
            </a>
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px 60px" }}>
        {error && (
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 12,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#fca5a5",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {loading && !report && (
          <div style={{ color: TEXT_MID, padding: "60px 0", textAlign: "center" }}>
            Loading dashboard...
          </div>
        )}

        {report && (
          <>
            {/* ─── TTM Hero Row ────────────────────────── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: "TTM Revenue",
                  value: fmtMoney(report.ttm.revenue, true),
                  sub: `${report.ttm.months} months`,
                  accent: GREEN,
                },
                {
                  label: "TTM Profit",
                  value: fmtMoney(report.ttm.profit, true),
                  sub: `${fmtPct(report.ttm.margin)} margin`,
                  accent: report.ttm.profit >= 0 ? GREEN : "#ef4444",
                },
                {
                  label: "Cash Position",
                  value: fmtMoney(report.cashPosition.total, true),
                  sub: `${report.cashPosition.accounts.length} account${report.cashPosition.accounts.length !== 1 ? "s" : ""}`,
                  accent: BLUE,
                },
                {
                  label: "MoM Growth",
                  value: fmtPct(report.momGrowth),
                  sub: `vs previous month`,
                  accent: report.momGrowth >= 0 ? GREEN : "#ef4444",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    background: DARK_CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: "20px 18px",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = BORDER_HOVER)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = BORDER)
                  }
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: TEXT_DIM,
                      marginBottom: 8,
                    }}
                  >
                    {card.label}
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: card.accent,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                    }}
                  >
                    {card.value}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 6 }}>
                    {card.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Monthly KPIs ────────────────────────── */}
            <div
              style={{
                background: DARK_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT_MID,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 16,
                }}
              >
                {report.availableMonths.find((m) => m.value === report!.monthKey)?.label || report.monthKey} — P&L
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 12,
                }}
              >
                {[
                  { label: "Gross Revenue", value: report.kpis.grossRevenue, color: GREEN },
                  { label: "Refunds", value: -report.kpis.refunds, color: "#f59e0b" },
                  { label: "Fees", value: -report.kpis.fees, color: "#f59e0b" },
                  { label: "Net Revenue", value: report.kpis.netRevenue, color: TEXT_BRIGHT },
                  { label: "Expenses", value: -report.kpis.expenses, color: "#ef4444" },
                  { label: "Net Profit", value: report.kpis.netProfit, color: report.kpis.netProfit >= 0 ? GREEN : "#ef4444" },
                  { label: "Margin", value: null, color: report.kpis.profitMargin >= 0.2 ? GREEN : "#f59e0b", pct: report.kpis.profitMargin },
                ].map((k) => (
                  <div key={k.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 6, fontWeight: 600 }}>
                      {k.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>
                      {k.pct !== undefined ? fmtPct(k.pct) : fmtMoney(k.value!)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Two Column: Revenue Sources + Expense Breakdown ─── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginBottom: 20,
              }}
            >
              {/* Revenue by Source */}
              <div
                style={{
                  background: DARK_CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT_MID,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 14,
                  }}
                >
                  Revenue by Source
                </div>
                {report.revenueBySource.length === 0 ? (
                  <div style={{ color: TEXT_DIM, fontSize: 14, padding: "20px 0" }}>
                    No revenue this month
                  </div>
                ) : (
                  report.revenueBySource.map((r) => {
                    const src = sourceLabel(r.source);
                    const pct = report!.kpis.grossRevenue > 0
                      ? (r.amount / report!.kpis.grossRevenue) * 100
                      : 0;
                    return (
                      <div key={r.source} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: src.color,
                                display: "inline-block",
                              }}
                            />
                            {src.label}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>
                            {fmtMoney(r.amount)}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: "rgba(255,255,255,0.06)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: src.color,
                              borderRadius: 3,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Expense Breakdown */}
              <div
                style={{
                  background: DARK_CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT_MID,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 14,
                  }}
                >
                  Expense Breakdown
                </div>
                {report.expenseBreakdown.length === 0 ? (
                  <div style={{ color: TEXT_DIM, fontSize: 14, padding: "20px 0" }}>
                    No expenses this month
                  </div>
                ) : (
                  report.expenseBreakdown.map((e) => (
                    <div
                      key={e.category}
                      onClick={() =>
                        setDrillCategory({
                          name: e.category,
                          amount: e.amount,
                          details: e.details,
                        })
                      }
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 8px",
                        borderRadius: 8,
                        cursor: "pointer",
                        borderBottom: `1px solid rgba(255,255,255,0.04)`,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{e.category}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                        {fmtMoney(e.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ─── Drill Down ──────────────────────────── */}
            {drillCategory && (
              <div
                style={{
                  background: DARK_CARD,
                  border: `1px solid ${BORDER_HOVER}`,
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                      }}
                    >
                      {drillCategory.name}
                    </span>
                    <span style={{ fontSize: 13, color: TEXT_DIM, marginLeft: 10 }}>
                      {fmtMoney(drillCategory.amount)} total
                    </span>
                  </div>
                  <button
                    onClick={() => setDrillCategory(null)}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      color: TEXT_MID,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Close
                  </button>
                </div>
                {drillCategory.details.length === 0 ? (
                  <div style={{ color: TEXT_DIM, fontSize: 13 }}>No detail items.</div>
                ) : (
                  drillCategory.details.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom:
                          i < drillCategory.details.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: TEXT_MID }}>{item.label}</span>
                      <span style={{ fontWeight: 700 }}>{fmtMoney(item.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── Monthly Trend (visual bars) ─────────── */}
            <div
              style={{
                background: DARK_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT_MID,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 16,
                }}
              >
                Monthly Revenue Trend
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  height: 140,
                  padding: "0 4px",
                }}
              >
                {report.monthlyTrend.map((m) => {
                  const height = (m.revenue / maxTrendRevenue) * 120;
                  const isSelected = m.month === report!.monthKey;
                  return (
                    <div
                      key={m.month}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setMonthKey(m.month);
                        fetchReport(m.month);
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: isSelected ? GREEN : TEXT_DIM,
                        }}
                      >
                        {fmtMoney(m.revenue, true)}
                      </div>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 48,
                          height: Math.max(height, 4),
                          borderRadius: "6px 6px 2px 2px",
                          background: isSelected
                            ? `linear-gradient(180deg, ${GREEN}, ${BLUE})`
                            : "rgba(37, 99, 235, 0.25)",
                          transition: "all 0.3s ease",
                        }}
                      />
                      <div
                        style={{
                          fontSize: 10,
                          color: isSelected ? TEXT_BRIGHT : TEXT_DIM,
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        {m.month.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Cash Accounts ────────────────────────── */}
            {report.cashPosition.accounts.length > 0 && (
              <div
                style={{
                  background: DARK_CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT_MID,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 14,
                  }}
                >
                  Connected Accounts
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {report.cashPosition.accounts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: `1px solid ${BORDER}`,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, marginBottom: 4 }}>
                        {a.institution} — {a.type}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{a.name}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: BLUE }}>
                        {fmtMoney(a.currentBalance)}
                      </div>
                      {a.lastUpdated && (
                        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>
                          Updated {timeAgo(a.lastUpdated)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Transactions ─────────────────────────── */}
            <div
              style={{
                background: DARK_CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT_MID,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Transactions ({filteredTxns.length})
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["ALL", "INCOME", "EXPENSE", "FEE", "REFUND"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTxFilter(f)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: `1px solid ${txFilter === f ? GREEN : BORDER}`,
                        background: txFilter === f ? "rgba(16, 185, 129, 0.12)" : "transparent",
                        color: txFilter === f ? GREEN : TEXT_DIM,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: TEXT_DIM, textAlign: "left" }}>
                      <th style={{ padding: "10px 8px", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "10px 8px", fontWeight: 600 }}>Source</th>
                      <th style={{ padding: "10px 8px", fontWeight: 600 }}>Description</th>
                      <th style={{ padding: "10px 8px", fontWeight: 600 }}>Category</th>
                      <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "24px 8px", color: TEXT_DIM, textAlign: "center" }}>
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredTxns.map((t) => {
                        const src = sourceLabel(t.source);
                        return (
                          <tr
                            key={t.id}
                            style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}
                          >
                            <td style={{ padding: "10px 8px", color: TEXT_MID }}>
                              {new Date(t.date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: src.color,
                                  background: `${src.color}18`,
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                }}
                              >
                                {src.label}
                              </span>
                            </td>
                            <td style={{ padding: "10px 8px", maxWidth: 300 }}>
                              <div
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {t.description}
                              </div>
                            </td>
                            <td style={{ padding: "10px 8px", color: TEXT_DIM }}>
                              {t.category || "—"}
                            </td>
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "right",
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                color: t.amount >= 0 ? GREEN : "#ef4444",
                              }}
                            >
                              {t.amount >= 0 ? "+" : ""}
                              {fmtMoney(t.amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── Sync Status ─────────────────────────── */}
            {report.lastSyncs.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  padding: "14px 18px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${BORDER}`,
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                  fontSize: 12,
                  color: TEXT_DIM,
                }}
              >
                <span style={{ fontWeight: 700 }}>Last syncs:</span>
                {report.lastSyncs.slice(0, 5).map((s, i) => (
                  <span key={i}>
                    <span style={{ color: sourceLabel(s.source).color, fontWeight: 600 }}>
                      {sourceLabel(s.source).label}
                    </span>{" "}
                    {s.status === "success" ? "✓" : "✗"}{" "}
                    {timeAgo(s.createdAt)}
                    {s.txAdded > 0 && ` (+${s.txAdded})`}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
