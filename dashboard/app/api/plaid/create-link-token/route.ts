import { NextResponse } from "next/server";

const PLAID_BASE_URL = process.env.PLAID_ENV === "production"
  ? "https://production.plaid.com"
  : process.env.PLAID_ENV === "development"
    ? "https://development.plaid.com"
    : "https://sandbox.plaid.com";

export async function POST() {
  try {
    const response = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        user: { client_user_id: "moneymachine-user" },
        client_name: "MoneyMachine",
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_message || "Failed to create link token");
    }

    const data = await response.json();
    return NextResponse.json({ link_token: data.link_token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
