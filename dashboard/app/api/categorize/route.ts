import { NextRequest, NextResponse } from "next/server";
import { categorizeTransactions, seedDefaultRules } from "@/lib/categorization";

// POST /api/categorize — run categorization engine
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const monthKey = body.monthKey || undefined;
    const force = body.force || false;
    const seed = body.seed || false;

    // Optionally seed default rules first
    if (seed) {
      const rulesCreated = await seedDefaultRules();
      if (rulesCreated > 0) {
        console.log(`Seeded ${rulesCreated} categorization rules`);
      }
    }

    const result = await categorizeTransactions({ monthKey, force });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Categorization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
