import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toMonthKey, classifyTransaction, logSync, getSyncDateRange } from "@/lib/sync-utils";

async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token;
}

export async function POST() {
  const startTime = Date.now();
  let txAdded = 0;
  let txUpdated = 0;

  try {
    const token = await getPayPalAccessToken();
    if (!token) {
      throw new Error("Failed to get PayPal access token. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
    }

    const { startDate, endDate } = getSyncDateRange(90);
    const startStr = startDate.toISOString().split(".")[0] + "Z";
    const endStr = endDate.toISOString().split(".")[0] + "Z";

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url = new URL("https://api-m.paypal.com/v1/reporting/transactions");
      url.searchParams.set("start_date", startStr);
      url.searchParams.set("end_date", endStr);
      url.searchParams.set("fields", "transaction_info,payer_info,cart_info");
      url.searchParams.set("page_size", "100");
      url.searchParams.set("page", String(page));

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayPal API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      totalPages = data.total_pages || 1;

      if (data.transaction_details) {
        for (const t of data.transaction_details) {
          const info = t.transaction_info;
          const amount = parseFloat(info.transaction_amount?.value || "0");
          const txId = info.transaction_id;
          const externalId = `paypal_${txId}`;
          const date = new Date(info.transaction_updated_date || info.transaction_initiation_date);
          const description =
            info.transaction_subject ||
            t.payer_info?.payer_name?.alternate_full_name ||
            info.transaction_note ||
            "PayPal transaction";

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
                raw: t as any,
                updatedAt: new Date(),
              },
            });
            txUpdated++;
          } else {
            await prisma.transaction.create({
              data: {
                date,
                amount: amount.toString(),
                description,
                vendor: t.payer_info?.payer_name?.alternate_full_name || undefined,
                currency: (info.transaction_amount?.currency_code || "USD").toUpperCase(),
                type,
                source: "PAYPAL",
                businessUnit: "COMBINED",
                monthKey: toMonthKey(date),
                externalId,
                raw: t as any,
              },
            });
            txAdded++;
          }
        }
      }

      page++;
    }

    const duration = Date.now() - startTime;
    await logSync("PAYPAL", "success", { txAdded, txUpdated, duration });

    return NextResponse.json({
      success: true,
      source: "paypal",
      txAdded,
      txUpdated,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown PayPal sync error";
    await logSync("PAYPAL", "error", { message, duration });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
