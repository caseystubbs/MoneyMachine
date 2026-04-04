import { prisma } from "./prisma";
import type { SourceAccount } from "@prisma/client";

export function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function classifyTransaction(
  amount: number,
  description: string
): "INCOME" | "REFUND" | "FEE" | "EXPENSE" {
  if (amount > 0) return "INCOME";
  const lower = description.toLowerCase();
  if (lower.includes("refund") || lower.includes("reversal")) return "REFUND";
  if (
    lower.includes("fee") ||
    lower.includes("processing") ||
    lower.includes("commission")
  )
    return "FEE";
  return "EXPENSE";
}

export async function logSync(
  source: SourceAccount,
  status: "success" | "error",
  opts: { message?: string; txAdded?: number; txUpdated?: number; duration?: number } = {}
) {
  await prisma.syncLog.create({
    data: {
      source,
      status,
      message: opts.message,
      txAdded: opts.txAdded ?? 0,
      txUpdated: opts.txUpdated ?? 0,
      duration: opts.duration,
    },
  });
}

/** Returns ISO date strings for a rolling window */
export function getSyncDateRange(daysBack: number = 90) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);
  return {
    startDate: start,
    endDate: end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}
