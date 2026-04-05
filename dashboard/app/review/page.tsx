"use client";

import { useEffect, useState, useCallback } from "react";

const GREEN = "#10B981";
const BLUE = "#2563EB";
const BORDER = "rgba(37, 99, 235, 0.12)";
const DARK_CARD = "rgba(11, 17, 32, 0.92)";
const TEXT_DIM = "#64748b";
const TEXT_MID = "#94a3b8";
const TEXT_BRIGHT = "#e2e8f0";

type Tx = {
  id: string;
  date: string;
  amount: number;
  description: string;
  vendor: string | null;
  source: string;
  type: string;
  monthKey: string;
  subcategory: string | null;
  subtype: string | null;
  isIgnored: boolean;
  isOneTime: boolean;
  isBusinessRelevant: boolean;
  manualOverride: boolean;
};

const SUBCATEGORIES = [
  "Software", "Rent", "Utilities", "Contractor", "Ads", "Media",
  "Sales", "Recurring", "Content", "Processing",
  "Transfer", "Loan", "Owner Draw", "Personal", "Groceries", "Food", "Gas",
  "Entertainment", "Shopping", "Health", "Home",
];

export default function ReviewPage() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [monthKey, setMonthKey] = useState("2026-03");
  const [filter, setFilter] = useState<"all" | "uncategorized" | "ignored" | "business">("all");
  const [categorizing, setCategorizing] = useState(false);
  const [catResult, setCatResult] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubcat, setEditSubcat] = useState("");
  const [editSubtype, setEditSubtype] = useState("");
  const [editIgnored, setEditIgnored] = useState(false);
  const [editCreateRule, setEditCreateRule] = useState(true);

  const fetchTxns = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ monthKey, limit: "500" });
    if (filter === "uncategorized") params.set("uncategorized", "true");
    if (filter === "ignored") params.set("ignored", "true");
    if (filter === "business") params.set("ignored", "false");

    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [monthKey, filter]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  async function runCategorization() {
    setCategorizing(true);
    setCatResult("");
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, force: true, seed: true }),
      });
      const data = await res.json();
      setCatResult(`Categorized ${data.categorized}, ${data.uncategorized} remaining`);
      fetchTxns();
    } catch {
      setCatResult("Categorization failed");
    } finally {
      setCategorizing(false);
    }
  }

  function startEdit(tx: Tx) {
    setEditingId(tx.id);
    setEditSubcat(tx.subcategory || "");
    setEditSubtype(tx.subtype || "");
    setEditIgnored(tx.isIgnored);
    setEditCreateRule(true);
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        subcategory: editSubcat || null,
        subtype: editSubtype || null,
        isIgnored: editIgnored,
        isBusinessRelevant: !editIgnored,
        createRule: editCreateRule,
      }),
    });
    setEditingId(null);
    fetchTxns();
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

  const srcColor: Record<string, string> = {
    STRIPE: "#635bff", PAYPAL: "#0070ba", PLAID: "#10b981", AMEX: "#006fcf",
    YOUTUBE: "#ff0000", SUBSTACK: "#ff6719", MANUAL: "#94a3b8",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg, #0B1120 0%, #0d1528 40%, #0f172a 100%)", color: TEXT_BRIGHT, fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(11,17,32,0.6)", backdropFilter: "blur(12px)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <a href="/dashboard" style={{ color: TEXT_DIM, fontSize: 12, textDecoration: "none", fontWeight: 600 }}>← Dashboard</a>
          <h1 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800 }}>Transaction Review</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.04)", color: TEXT_BRIGHT, fontSize: 13 }}>
            {["2026-04","2026-03","2026-02","2026-01","2025-12","2025-11","2025-10","2025-09","2025-08","2025-07","2025-06","2025-05","2025-04","2025-03"].map((m) => (
              <option key={m} value={m} style={{ color: "#111" }}>{m}</option>
            ))}
          </select>
          {(["all","uncategorized","ignored","business"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${filter === f ? GREEN : BORDER}`, background: filter === f ? "rgba(16,185,129,0.12)" : "transparent", color: filter === f ? GREEN : TEXT_DIM, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
              {f}
            </button>
          ))}
          <button onClick={runCategorization} disabled={categorizing} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: categorizing ? TEXT_DIM : BLUE, color: "white", fontWeight: 700, fontSize: 12, cursor: categorizing ? "not-allowed" : "pointer" }}>
            {categorizing ? "Running..." : "Auto-Categorize"}
          </button>
          {catResult && <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>{catResult}</span>}
        </div>
      </div>

      {/* Table */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 12 }}>{total} transactions</div>
        <div style={{ background: DARK_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: TEXT_DIM, textAlign: "left", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Date</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Source</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Description</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600, textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Subtype</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Flags</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: TEXT_DIM }}>Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: TEXT_DIM }}>No transactions found</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px", color: TEXT_MID, whiteSpace: "nowrap" }}>{new Date(tx.date).toLocaleDateString()}</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: srcColor[tx.source] || TEXT_DIM, background: `${srcColor[tx.source] || TEXT_DIM}18`, padding: "2px 6px", borderRadius: 4 }}>
                          {tx.source}
                        </span>
                      </td>
                      <td style={{ padding: "8px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: tx.amount >= 0 ? GREEN : "#ef4444", fontVariantNumeric: "tabular-nums" }}>
                        {fmtMoney(tx.amount)}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {editingId === tx.id ? (
                          <select value={editSubcat} onChange={(e) => setEditSubcat(e.target.value)} style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT_BRIGHT, fontSize: 12, width: 120 }}>
                            <option value="" style={{ color: "#111" }}>—</option>
                            {SUBCATEGORIES.map((s) => <option key={s} value={s} style={{ color: "#111" }}>{s}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: 12, color: tx.subcategory ? TEXT_BRIGHT : "#ef4444", fontWeight: tx.subcategory ? 600 : 400 }}>
                            {tx.subcategory || "Uncategorized"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {editingId === tx.id ? (
                          <input value={editSubtype} onChange={(e) => setEditSubtype(e.target.value)} placeholder="subtype" style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.06)", color: TEXT_BRIGHT, fontSize: 12, width: 90 }} />
                        ) : (
                          <span style={{ fontSize: 11, color: TEXT_DIM }}>{tx.subtype || "—"}</span>
                        )}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {editingId === tx.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, color: TEXT_MID, cursor: "pointer" }}>
                              <input type="checkbox" checked={editIgnored} onChange={(e) => setEditIgnored(e.target.checked)} /> Ignored
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, color: TEXT_MID, cursor: "pointer" }}>
                              <input type="checkbox" checked={editCreateRule} onChange={(e) => setEditCreateRule(e.target.checked)} /> Create rule
                            </label>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 4 }}>
                            {tx.isIgnored && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>IGN</span>}
                            {tx.isOneTime && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(251,191,36,0.15)", color: "#fcd34d" }}>1x</span>}
                            {tx.manualOverride && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(99,91,255,0.15)", color: "#a5b4fc" }}>MAN</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px" }}>
                        {editingId === tx.id ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={saveEdit} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: GREEN, color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_MID, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(tx)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_MID, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
