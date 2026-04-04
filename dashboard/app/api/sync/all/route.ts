import { NextResponse } from "next/server";

const SOURCES = ["stripe", "paypal", "plaid"] as const;

export async function POST(req: Request) {
  const origin = req.headers.get("origin") || req.headers.get("host") || "http://localhost:3000";
  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

  const results: Record<string, any> = {};

  for (const source of SOURCES) {
    try {
      const res = await fetch(`${baseUrl}/api/sync/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      results[source] = await res.json();
    } catch (error) {
      results[source] = {
        error: error instanceof Error ? error.message : `Failed to sync ${source}`,
      };
    }
  }

  const allSuccess = Object.values(results).every((r) => r.success);

  return NextResponse.json({
    success: allSuccess,
    results,
  });
}
