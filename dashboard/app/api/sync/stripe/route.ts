import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { toMonthKey, classifyTransaction, logSync, getSyncDateRange } from "@/lib/sync-utils";

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "").trim(), {
  apiVersion: "2026-02-25.clover",
});

export async function POST() {
  const startTime = Date.now();
  let txAdded = 0;
  let txUpdated = 0;

  try {
    const { startDate } = getSyncDateRange(90);
    const sinceTimestamp = Math.floor(startDate.getTime() / 1000);

    // --- Pull Stripe charges (income) ---
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: Stripe.ChargeListParams = {
        limit: 100,
        created: { gte: sinceTimestamp },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const charges = await stripe.charges.list(params);

      for (const charge of charges.data) {
        if (!charge.paid) continue;

        const externalId = `stripe_charge_${charge.id}`;
        const date = new Date(charge.created * 1000);
        const amount = charge.amount / 100;
        const fee = charge.balance_transaction
          ? 0 // we'll pull fees separately from balance transactions
          : 0;

        const existing = await prisma.transaction.findUnique({
          where: { externalId },
        });

        if (existing) {
          await prisma.transaction.update({
            where: { externalId },
            data: {
              amount: amount.toString(),
              description: charge.description || charge.statement_descriptor || "Stripe charge",
              raw: charge as any,
              updatedAt: new Date(),
            },
          });
          txUpdated++;
        } else {
          await prisma.transaction.create({
            data: {
              date,
              amount: amount.toString(),
              description: charge.description || charge.statement_descriptor || "Stripe charge",
              vendor: charge.billing_details?.name || undefined,
              currency: charge.currency.toUpperCase(),
              type: "INCOME",
              source: "STRIPE",
              businessUnit: "COMBINED",
              monthKey: toMonthKey(date),
              externalId,
              raw: charge as any,
            },
          });
          txAdded++;
        }
      }

      hasMore = charges.has_more;
      if (charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id;
      }
    }

    // --- Pull Stripe balance transactions for fees ---
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const params: Stripe.BalanceTransactionListParams = {
        limit: 100,
        created: { gte: sinceTimestamp },
        type: "charge",
      };
      if (startingAfter) params.starting_after = startingAfter;

      const balanceTxns = await stripe.balanceTransactions.list(params);

      for (const bt of balanceTxns.data) {
        if (bt.fee === 0) continue;

        const externalId = `stripe_fee_${bt.id}`;
        const date = new Date(bt.created * 1000);
        const feeAmount = -(bt.fee / 100); // fees are negative

        const existing = await prisma.transaction.findUnique({
          where: { externalId },
        });

        if (!existing) {
          await prisma.transaction.create({
            data: {
              date,
              amount: feeAmount.toString(),
              description: `Stripe processing fee`,
              currency: bt.currency.toUpperCase(),
              type: "FEE",
              source: "STRIPE",
              businessUnit: "COMBINED",
              monthKey: toMonthKey(date),
              externalId,
              raw: { fee: bt.fee, net: bt.net, source_id: bt.source } as any,
            },
          });
          txAdded++;
        }
      }

      hasMore = balanceTxns.has_more;
      if (balanceTxns.data.length > 0) {
        startingAfter = balanceTxns.data[balanceTxns.data.length - 1].id;
      }
    }

    // --- Pull refunds ---
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const params: Stripe.RefundListParams = {
        limit: 100,
        created: { gte: sinceTimestamp },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const refunds = await stripe.refunds.list(params);

      for (const refund of refunds.data) {
        const externalId = `stripe_refund_${refund.id}`;
        const date = new Date(refund.created * 1000);
        const amount = -(refund.amount / 100);

        const existing = await prisma.transaction.findUnique({
          where: { externalId },
        });

        if (!existing) {
          await prisma.transaction.create({
            data: {
              date,
              amount: amount.toString(),
              description: `Stripe refund – ${refund.reason || "no reason"}`,
              currency: refund.currency.toUpperCase(),
              type: "REFUND",
              source: "STRIPE",
              businessUnit: "COMBINED",
              monthKey: toMonthKey(date),
              externalId,
              raw: refund as any,
            },
          });
          txAdded++;
        }
      }

      hasMore = refunds.has_more;
      if (refunds.data.length > 0) {
        startingAfter = refunds.data[refunds.data.length - 1].id;
      }
    }

    const duration = Date.now() - startTime;
    await logSync("STRIPE", "success", { txAdded, txUpdated, duration });

    return NextResponse.json({
      success: true,
      source: "stripe",
      txAdded,
      txUpdated,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown Stripe sync error";
    await logSync("STRIPE", "error", { message, duration });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
