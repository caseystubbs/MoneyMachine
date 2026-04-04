import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSync } from "@/lib/sync-utils";

/**
 * Daily cron sync endpoint.
 *
 * Set up a cron job to POST to this endpoint daily:
 *   - Railway: Add a cron service that calls: curl -X POST https://your-app.railway.app/api/cron/daily-sync -H "Authorization: Bearer YOUR_CRON_SECRET"
 *   - Or use a free service like cron-job.org
 *
 * Protected by CRON_SECRET env var to prevent unauthorized access.
 */
export async function POST(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results: Record<string, any> = {};
  const sources = ["stripe", "paypal", "plaid"];

  // Determine base URL
  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  for (const source of sources) {
    try {
      const res = await fetch(`${baseUrl}/api/sync/${source}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      results[source] = {
        success: !!data.success,
        txAdded: data.txAdded || 0,
        txUpdated: data.txUpdated || 0,
        duration: data.duration,
        error: data.error || null,
      };
    } catch (error) {
      results[source] = {
        success: false,
        error: error instanceof Error ? error.message : `Failed to sync ${source}`,
      };
    }
  }

  const totalAdded = Object.values(results).reduce(
    (sum: number, r: any) => sum + (r.txAdded || 0),
    0
  );
  const totalUpdated = Object.values(results).reduce(
    (sum: number, r: any) => sum + (r.txUpdated || 0),
    0
  );
  const allSuccess = Object.values(results).every((r: any) => r.success);
  const duration = Date.now() - startTime;

  // Log the overall cron run
  await logSync("MANUAL", allSuccess ? "success" : "error", {
    message: `Daily cron: ${totalAdded} added, ${totalUpdated} updated across ${sources.length} sources`,
    txAdded: totalAdded,
    txUpdated: totalUpdated,
    duration,
  });

  return NextResponse.json({
    success: allSuccess,
    totalAdded,
    totalUpdated,
    duration: `${duration}ms`,
    results,
  });
}

// Also support GET for easy testing in browser
export async function GET(req: NextRequest) {
  return NextResponse.json({
    endpoint: "/api/cron/daily-sync",
    method: "POST",
    description: "Syncs all data sources (Stripe, PayPal, Plaid). Protected by CRON_SECRET env var.",
    usage: 'curl -X POST https://your-app.railway.app/api/cron/daily-sync -H "Authorization: Bearer YOUR_CRON_SECRET"',
  });
}
