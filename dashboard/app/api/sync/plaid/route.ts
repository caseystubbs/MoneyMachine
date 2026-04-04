import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toMonthKey, classifyTransaction, logSync } from "@/lib/sync-utils";

const PLAID_BASE_URL = process.env.PLAID_ENV === "production"
  ? "https://production.plaid.com"
  : process.env.PLAID_ENV === "development"
    ? "https://development.plaid.com"
    : "https://sandbox.plaid.com";

async function plaidRequest(endpoint: string, body: Record<string, any>) {
  const response = await fetch(`${PLAID_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Plaid ${endpoint} failed: ${error.error_message || error.message || response.status}`);
  }

  return response.json();
}

export async function POST() {
  const startTime = Date.now();
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    // Get all connected Plaid items
    const plaidItems = await prisma.plaidItem.findMany({
      include: { accounts: true },
    });

    if (plaidItems.length === 0) {
      return NextResponse.json({
        success: true,
        source: "plaid",
        message: "No Plaid accounts connected. Use /connect to link a bank account.",
        txAdded: 0,
        txUpdated: 0,
      });
    }

    for (const item of plaidItems) {
      let cursor = item.cursor || undefined;
      let hasMore = true;
      let itemAdded = 0;
      let itemUpdated = 0;

      // --- Sync transactions using cursor-based sync ---
      while (hasMore) {
        const syncResponse = await plaidRequest("/transactions/sync", {
          access_token: item.accessToken,
          cursor,
          count: 500,
        });

        // Process added transactions
        for (const t of syncResponse.added || []) {
          const externalId = `plaid_${t.transaction_id}`;
          const date = new Date(t.date);
          const amount = -t.amount; // Plaid uses positive=debit, we want positive=income
          const description = t.name || t.merchant_name || "Bank transaction";
          const type = classifyTransaction(amount, description);

          // Find matching PlaidAccount
          const plaidAccount = item.accounts.find(
            (a) => a.plaidAccountId === t.account_id
          );

          const existing = await prisma.transaction.findUnique({
            where: { externalId },
          });

          if (!existing) {
            await prisma.transaction.create({
              data: {
                date,
                amount: amount.toString(),
                description,
                vendor: t.merchant_name || undefined,
                currency: t.iso_currency_code || "USD",
                type,
                source: "PLAID",
                businessUnit: "COMBINED",
                monthKey: toMonthKey(date),
                externalId,
                plaidAccountId: plaidAccount?.id || undefined,
                raw: t as any,
              },
            });
            itemAdded++;
          }
        }

        // Process modified transactions
        for (const t of syncResponse.modified || []) {
          const externalId = `plaid_${t.transaction_id}`;
          const amount = -t.amount;
          const description = t.name || t.merchant_name || "Bank transaction";
          const type = classifyTransaction(amount, description);

          const existing = await prisma.transaction.findUnique({
            where: { externalId },
          });

          if (existing) {
            await prisma.transaction.update({
              where: { externalId },
              data: {
                amount: amount.toString(),
                description,
                vendor: t.merchant_name || undefined,
                type,
                raw: t as any,
                updatedAt: new Date(),
              },
            });
            itemUpdated++;
          }
        }

        // Process removed transactions
        for (const t of syncResponse.removed || []) {
          const externalId = `plaid_${t.transaction_id}`;
          await prisma.transaction.deleteMany({
            where: { externalId },
          });
        }

        cursor = syncResponse.next_cursor;
        hasMore = syncResponse.has_more;
      }

      // Update cursor for next sync
      await prisma.plaidItem.update({
        where: { id: item.id },
        data: { cursor },
      });

      // --- Update account balances ---
      try {
        const balanceResponse = await plaidRequest("/accounts/balance/get", {
          access_token: item.accessToken,
        });

        for (const account of balanceResponse.accounts || []) {
          await prisma.plaidAccount.updateMany({
            where: { plaidAccountId: account.account_id },
            data: {
              currentBalance: account.balances.current?.toString(),
              availableBalance: account.balances.available?.toString(),
              balanceUpdatedAt: new Date(),
            },
          });
        }
      } catch (balanceErr) {
        // Non-fatal — log but continue
        console.error("Balance update failed for item", item.id, balanceErr);
      }

      totalAdded += itemAdded;
      totalUpdated += itemUpdated;
    }

    const duration = Date.now() - startTime;
    await logSync("PLAID", "success", {
      txAdded: totalAdded,
      txUpdated: totalUpdated,
      duration,
    });

    return NextResponse.json({
      success: true,
      source: "plaid",
      txAdded: totalAdded,
      txUpdated: totalUpdated,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown Plaid sync error";
    await logSync("PLAID", "error", { message, duration });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
