"use client";

import { useMemo, useRef, useState } from "react";

type StatusType = "idle" | "success" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<StatusType>("idle");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const acceptedColumns = useMemo(
    () => [
      "date",
      "amount",
      "description",
      "businessUnit",
      "currency",
      "monthKey",
    ],
    []
  );

  function handleFileSelect(selectedFile: File | null) {
    setFile(selectedFile);
    setMessage("");
    setStatus("idle");
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0] || null;
    if (!droppedFile) return;

    if (!droppedFile.name.toLowerCase().endsWith(".csv")) {
      setStatus("error");
      setMessage("Only CSV files are supported.");
      return;
    }

    handleFileSelect(droppedFile);
  }

  async function handleUpload() {
    if (!file) {
      setStatus("error");
      setMessage("Please choose a CSV file first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setStatus("idle");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-transactions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      setStatus("success");
      setMessage(`Upload successful. Inserted ${data.inserted} rows.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unexpected upload error."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #0b1020 0%, #11182b 50%, #0b1020 100%)",
        color: "#f8fafc",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#a78bfa",
              marginBottom: 10,
            }}
          >
            MoneyMachine
          </div>

          <h1
            style={{
              fontSize: 36,
              lineHeight: 1.1,
              fontWeight: 800,
              margin: 0,
            }}
          >
            Upload Transactions CSV
          </h1>

          <p
            style={{
              marginTop: 12,
              color: "#cbd5e1",
              fontSize: 16,
              maxWidth: 700,
            }}
          >
            Upload a clean CSV to import transactions into your dashboard. This
            is the fastest way to update revenue, fees, and expenses without
            touching the database manually.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={openFilePicker}
              style={{
                border: dragActive
                  ? "2px solid #8b5cf6"
                  : "2px dashed rgba(148, 163, 184, 0.28)",
                background: dragActive
                  ? "rgba(139, 92, 246, 0.12)"
                  : "rgba(255,255,255,0.02)",
                borderRadius: 18,
                padding: "40px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Drag & drop your CSV here
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 14,
                  marginBottom: 18,
                }}
              >
                or click to choose a file
              </div>

              <div
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "#8b5cf6",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Choose CSV
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    marginBottom: 6,
                  }}
                >
                  Selected file
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: file ? "#f8fafc" : "#64748b",
                  }}
                >
                  {file ? file.name : "No file selected"}
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={loading}
                style={{
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: loading ? "#475569" : "#22c55e",
                  color: "white",
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  minWidth: 150,
                }}
              >
                {loading ? "Uploading..." : "Upload CSV"}
              </button>
            </div>

            {message && (
              <div
                style={{
                  marginTop: 18,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border:
                    status === "success"
                      ? "1px solid rgba(34, 197, 94, 0.35)"
                      : "1px solid rgba(239, 68, 68, 0.35)",
                  background:
                    status === "success"
                      ? "rgba(34, 197, 94, 0.10)"
                      : "rgba(239, 68, 68, 0.10)",
                  color: status === "success" ? "#bbf7d0" : "#fecaca",
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {message}
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: 14,
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                Expected CSV columns
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                {acceptedColumns.map((col) => (
                  <div
                    key={col}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(148, 163, 184, 0.12)",
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: 14,
                      color: "#e2e8f0",
                    }}
                  >
                    {col}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 20,
                padding: 24,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: 14,
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                Example row
              </h2>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#cbd5e1",
                  overflowX: "auto",
                }}
              >
                2026-02-13,935.00,Learn To Trade For Pro Payment,FREEDOM_INCOME_OPTIONS,USD,2026-02
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="/dashboard"
                  style={{
                    textDecoration: "none",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                    color: "#f8fafc",
                    fontWeight: 700,
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                  }}
                >
                  View Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}