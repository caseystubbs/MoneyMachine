import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_message || `Plaid ${endpoint} failed`);
  }

  return response.json();
}

export async function POST(req: Request) {
  try {
    const { public_token, institution } = await req.json();

    if (!public_token) {
      return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidRequest("/item/public_token/exchange", {
      public_token,
    });

    const { access_token, item_id } = exchangeResponse;

    // Check if this item already exists
    const existingItem = await prisma.plaidItem.findUnique({
      where: { itemId: item_id },
    });

    if (existingItem) {
      return NextResponse.json({
        success: true,
        message: "This bank account is already connected.",
        itemId: existingItem.id,
      });
    }

    // Create PlaidItem
    const plaidItem = await prisma.plaidItem.create({
      data: {
        itemId: item_id,
        accessToken: access_token,
        institutionId: institution?.institution_id || null,
        institutionName: institution?.name || null,
      },
    });

    // Fetch accounts and store them
    const accountsResponse = await plaidRequest("/accounts/get", {
      access_token,
    });

    for (const account of accountsResponse.accounts || []) {
      await prisma.plaidAccount.create({
        data: {
          plaidAccountId: account.account_id,
          name: account.name,
          officialName: account.official_name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          currentBalance: account.balances.current?.toString(),
          availableBalance: account.balances.available?.toString(),
          balanceUpdatedAt: new Date(),
          plaidItemId: plaidItem.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      itemId: plaidItem.id,
      accountsConnected: accountsResponse.accounts?.length || 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
