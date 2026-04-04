"use client";

import { useEffect, useState, useCallback } from "react";

const NAVY = "#0B1120";
const GREEN = "#10B981";
const BLUE = "#2563EB";
const BORDER = "rgba(37, 99, 235, 0.12)";
const DARK_CARD = "rgba(11, 17, 32, 0.92)";
const TEXT_DIM = "#64748b";
const TEXT_MID = "#94a3b8";
const TEXT_BRIGHT = "#e2e8f0";

export default function ConnectPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [plaidReady, setPlaidReady] = useState(false);

  // Load Plaid Link script
  useEffect(() => {
    if (document.getElementById("plaid-link-script")) {
      setPlaidReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "plaid-link-script";
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.onload = () => setPlaidReady(true);
    document.head.appendChild(script);
  }, []);

  // Get a link token when the page loads
  useEffect(() => {
    fetch("/api/plaid/create-link-token", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.link_token) setLinkToken(data.link_token);
        else {
          setStatus("error");
          setMessage(data.error || "Failed to create link token");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not reach Plaid. Check your API keys.");
      });
  }, []);

  const openPlaidLink = useCallback(() => {
    if (!linkToken || !plaidReady || !(window as any).Plaid) return;

    const handler = (window as any).Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: any) => {
        setLoading(true);
        setStatus("idle");
        setMessage("");

        try {
          const res = await fetch("/api/plaid/exchange-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              public_token: publicToken,
              institution: metadata.institution,
            }),
          });

          const data = await res.json();

          if (data.success) {
            setStatus("success");
            setMessage(
              `Connected ${metadata.institution?.name || "bank account"}! ${data.accountsConnected} account(s) linked.`
            );
          } else {
            throw new Error(data.error || "Exchange failed");
          }
        } catch (err) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Connection failed");
        } finally {
          setLoading(false);
        }
      },
      onExit: (err: any) => {
        if (err) {
          setStatus("error");
          setMessage(err.display_message || err.error_message || "Plaid Link closed with error");
        }
      },
    });

    handler.open();
  }, [linkToken, plaidReady]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(170deg, ${NAVY} 0%, #0d1528 40%, #0f172a 100%)`,
        color: TEXT_BRIGHT,
        fontFamily:
          '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* Back link */}
        <a
          href="/dashboard"
          style={{
            color: TEXT_DIM,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 32,
          }}
        >
          ← Back to Dashboard
        </a>

        <div
          style={{
            background: DARK_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 18,
            padding: 32,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${GREEN}, ${BLUE})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              marginBottom: 20,
            }}
          >
            🏦
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 8,
            }}
          >
            Connect Bank Account
          </h1>

          <p style={{ color: TEXT_MID, fontSize: 15, marginTop: 0, marginBottom: 28, lineHeight: 1.6 }}>
            Link your bank account through Plaid to automatically sync transactions 
            and see your real cash position on the dashboard.
          </p>

          <button
            onClick={openPlaidLink}
            disabled={!linkToken || !plaidReady || loading}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 12,
              border: "none",
              background: (!linkToken || loading) ? TEXT_DIM : GREEN,
              color: "white",
              fontSize: 15,
              fontWeight: 800,
              cursor: (!linkToken || loading) ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {loading
              ? "Connecting..."
              : !linkToken
                ? "Loading Plaid..."
                : "Connect Your Bank"}
          </button>

          {message && (
            <div
              style={{
                marginTop: 20,
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px solid ${
                  status === "success"
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(239, 68, 68, 0.3)"
                }`,
                background:
                  status === "success"
                    ? "rgba(16, 185, 129, 0.08)"
                    : "rgba(239, 68, 68, 0.08)",
                color: status === "success" ? "#6ee7b7" : "#fca5a5",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}

          {status === "success" && (
            <a
              href="/dashboard"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 16,
                padding: "12px 20px",
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: "rgba(255,255,255,0.04)",
                color: TEXT_BRIGHT,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Go to Dashboard →
            </a>
          )}
        </div>

        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${BORDER}`,
            fontSize: 13,
            color: TEXT_DIM,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: TEXT_MID }}>How it works:</strong> Plaid securely connects 
          to your bank. We store an access token to sync transactions automatically. 
          Your banking credentials are never stored — Plaid handles authentication directly.
        </div>
      </div>
    </div>
  );
}
