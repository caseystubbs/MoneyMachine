/**
 * Seed March 2026 data from uploaded statements.
 * Run: DATABASE_URL="postgresql://..." npx tsx prisma/seed-march-2026.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding March 2026...\n");

  const MK = "2026-03";
  let created = 0;
  let skipped = 0;

  // Helper to upsert
  async function addTx(data: {
    externalId: string;
    date: string;
    amount: number;
    description: string;
    type: "INCOME" | "EXPENSE" | "FEE" | "REFUND";
    source: "STRIPE" | "PAYPAL" | "AMEX" | "MANUAL";
    vendor?: string;
    categoryName?: string;
  }) {
    const existing = await prisma.transaction.findUnique({
      where: { externalId: data.externalId },
    });
    if (existing) { skipped++; return; }

    let categoryId: string | undefined;
    if (data.categoryName) {
      const cat = await prisma.category.findUnique({ where: { name: data.categoryName } });
      if (cat) categoryId = cat.id;
    }

    await prisma.transaction.create({
      data: {
        date: new Date(data.date),
        amount: data.amount.toString(),
        description: data.description,
        vendor: data.vendor,
        currency: "USD",
        type: data.type,
        source: data.source,
        businessUnit: "COMBINED",
        monthKey: MK,
        externalId: data.externalId,
        categoryId,
      },
    });
    created++;
  }

  // ─── STRIPE REVENUE ────────────────────────────────────
  // Gross activity: $4,767.44
  await addTx({
    externalId: "seed_rev_2026-03_stripe",
    date: "2026-03-15",
    amount: 4767.44,
    description: "Stripe revenue — March 2026",
    type: "INCOME",
    source: "STRIPE",
    vendor: "Stripe",
  });

  // Stripe fees: $248.10 processing + $45.00 payout fees
  await addTx({
    externalId: "seed_fee_2026-03_stripe",
    date: "2026-03-15",
    amount: -293.10,
    description: "Stripe processing + payout fees — March 2026",
    type: "FEE",
    source: "STRIPE",
    categoryName: "Fees",
  });

  // ─── PAYPAL REVENUE ────────────────────────────────────
  // Payments received: $5,646.06
  await addTx({
    externalId: "seed_rev_2026-03_paypal",
    date: "2026-03-15",
    amount: 5646.06,
    description: "PayPal payments received — March 2026",
    type: "INCOME",
    source: "PAYPAL",
    vendor: "PayPal",
  });

  // PayPal fees: $237.74
  await addTx({
    externalId: "seed_fee_2026-03_paypal",
    date: "2026-03-15",
    amount: -237.74,
    description: "PayPal processing fees — March 2026",
    type: "FEE",
    source: "PAYPAL",
    categoryName: "Fees",
  });

  // PayPal chargeback: $100.00
  await addTx({
    externalId: "seed_refund_2026-03_chargeback",
    date: "2026-03-27",
    amount: -100.00,
    description: "PayPal chargeback",
    type: "REFUND",
    source: "PAYPAL",
  });

  // PayPal refund: $100.00 (Arthur Cunningham)
  await addTx({
    externalId: "seed_refund_2026-03_cunningham",
    date: "2026-03-26",
    amount: -100.00,
    description: "PayPal refund — Arthur Cunningham",
    type: "REFUND",
    source: "PAYPAL",
  });

  // ─── AMEX BUSINESS CHECKING *3813 INCOME ───────────────
  await addTx({
    externalId: "seed_rev_2026-03_amex3813_lttp",
    date: "2026-03-13",
    amount: 1100.00,
    description: "Learn To Trade For Pro Payment",
    type: "INCOME",
    source: "AMEX",
    vendor: "FIN MC LLC",
  });

  await addTx({
    externalId: "seed_rev_2026-03_amex3813_wire",
    date: "2026-03-31",
    amount: 575.00,
    description: "Wire Transfer Domestic Incoming",
    type: "INCOME",
    source: "AMEX",
  });

  // ─── SOFTWARE / TOOLS EXPENSES ─────────────────────────
  // From PayPal debit card transactions
  const softwareExpenses = [
    { id: "railway", date: "2026-03-02", amount: 9.80, desc: "Railway" },
    { id: "make", date: "2026-03-03", amount: 10.59, desc: "Make.com" },
    { id: "wpengine", date: "2026-03-03", amount: 53.00, desc: "WPEngine" },
    { id: "canva", date: "2026-03-04", amount: 15.00, desc: "Canva" },
    { id: "rumble", date: "2026-03-08", amount: 100.00, desc: "Rumble USA" },
    { id: "roezan", date: "2026-03-09", amount: 8.00, desc: "Roezan SMS" },
    { id: "buzzsprout", date: "2026-03-09", amount: 27.00, desc: "Buzzsprout" },
    { id: "pdfmonkey", date: "2026-03-10", amount: 5.96, desc: "PDFMonkey" },
    { id: "riverside", date: "2026-03-11", amount: 29.00, desc: "Riverside.fm" },
    { id: "googleone", date: "2026-03-11", amount: 10.59, desc: "Google One" },
    { id: "xdevplatform1", date: "2026-03-14", amount: 5.00, desc: "X Developer Platform" },
    { id: "postmark", date: "2026-03-14", amount: 66.44, desc: "Postmarkapp" },
    { id: "xdevplatform2", date: "2026-03-14", amount: 5.00, desc: "X Developer Platform" },
    { id: "xdevplatform3", date: "2026-03-15", amount: 10.00, desc: "X Developer Platform" },
    { id: "xcorp_paid1", date: "2026-03-09", amount: 1.00, desc: "X Corp Paid Features" },
    { id: "xcorp_paid2", date: "2026-03-15", amount: 40.00, desc: "X Corp Paid Features" },
    { id: "zendesk", date: "2026-03-17", amount: 25.00, desc: "Zendesk" },
    { id: "claude_ai", date: "2026-03-18", amount: 20.00, desc: "Claude.ai Subscription" },
    { id: "descript", date: "2026-03-24", amount: 35.00, desc: "Descript" },
    { id: "adobe", date: "2026-03-22", amount: 21.34, desc: "Adobe" },
    { id: "roku", date: "2026-03-14", amount: 31.79, desc: "Roku" },
    { id: "apex_hosting", date: "2026-03-22", amount: 22.49, desc: "Apex Hosting" },
    { id: "vidiq", date: "2026-03-07", amount: 9.50, desc: "VidIQ" },
    { id: "sanebox", date: "2026-03-26", amount: 14.99, desc: "SaneBox" },
    { id: "chatbotai", date: "2026-03-25", amount: 1.99, desc: "Paddle ChatbotAI" },
    { id: "ninjatrader", date: "2026-03-31", amount: 12.00, desc: "NinjaTrader" },
    { id: "fmp1", date: "2026-03-05", amount: 139.00, desc: "FinancialModelingPrep" },
    { id: "fmp2", date: "2026-03-31", amount: 139.00, desc: "FinancialModelingPrep" },
    { id: "bluehost", date: "2026-03-15", amount: 263.88, desc: "Bluehost" },
    { id: "google_workspace", date: "2026-03-01", amount: 16.80, desc: "Google Workspace" },
    { id: "tmobile", date: "2026-03-17", amount: 94.35, desc: "T-Mobile" },
    { id: "fullscript", date: "2026-03-27", amount: 41.84, desc: "Fullscript" },
    { id: "adaptive1", date: "2026-03-20", amount: 20.00, desc: "Adaptive Computer" },
    { id: "adaptive2", date: "2026-03-23", amount: 82.12, desc: "Adaptive Computer" },
    { id: "adaptive3", date: "2026-03-31", amount: 20.00, desc: "Adaptive Computer" },
    { id: "amazon_prime", date: "2026-03-09", amount: 3.19, desc: "Amazon Prime" },
    { id: "prime_video", date: "2026-03-04", amount: 13.87, desc: "Prime Video Channels" },
    { id: "chatgpt_google", date: "2026-03-28", amount: 21.19, desc: "Google ChatGPT" },
  ];

  // OpenAI charges (multiple small ones)
  const openaiCharges = [
    { id: "openai1", date: "2026-03-05", amount: 10.00 },
    { id: "openai2", date: "2026-03-19", amount: 5.08 },
    { id: "openai3", date: "2026-03-19", amount: 5.08 },
    { id: "openai4", date: "2026-03-19", amount: 5.17 },
    { id: "openai5", date: "2026-03-20", amount: 5.07 },
    { id: "openai6", date: "2026-03-20", amount: 5.02 },
    { id: "openai7", date: "2026-03-21", amount: 5.08 },
    { id: "openai8", date: "2026-03-21", amount: 5.10 },
    { id: "openai9", date: "2026-03-21", amount: 5.15 },
    { id: "openai10", date: "2026-03-21", amount: 5.19 },
    { id: "openai11", date: "2026-03-21", amount: 5.03 },
    { id: "openai12", date: "2026-03-24", amount: 5.02 },
    { id: "openai13", date: "2026-03-24", amount: 5.01 },
    { id: "openai14", date: "2026-03-24", amount: 5.09 },
    { id: "openai15", date: "2026-03-27", amount: 5.15 },
    { id: "openai16", date: "2026-03-27", amount: 5.01 },
    { id: "openai17", date: "2026-03-27", amount: 5.10 },
  ];

  // Anthropic charges
  const anthropicCharges = [
    { id: "anthropic1", date: "2026-03-20", amount: 5.00 },
    { id: "anthropic2", date: "2026-03-27", amount: 5.00 },
    { id: "anthropic3", date: "2026-03-27", amount: 5.00 },
    { id: "anthropic4", date: "2026-03-28", amount: 10.24 },
    { id: "anthropic5", date: "2026-03-30", amount: 10.26 },
  ];

  for (const s of softwareExpenses) {
    await addTx({
      externalId: `seed_exp_2026-03_sw_${s.id}`,
      date: s.date,
      amount: -s.amount,
      description: s.desc,
      type: "EXPENSE",
      source: "PAYPAL",
      vendor: s.desc,
      categoryName: "Software",
    });
  }

  for (const o of openaiCharges) {
    await addTx({
      externalId: `seed_exp_2026-03_${o.id}`,
      date: o.date,
      amount: -o.amount,
      description: "OpenAI",
      type: "EXPENSE",
      source: "PAYPAL",
      vendor: "OpenAI",
      categoryName: "Software",
    });
  }

  for (const a of anthropicCharges) {
    await addTx({
      externalId: `seed_exp_2026-03_${a.id}`,
      date: a.date,
      amount: -a.amount,
      description: "Anthropic",
      type: "EXPENSE",
      source: "PAYPAL",
      vendor: "Anthropic",
      categoryName: "Software",
    });
  }

  // ─── PAYPAL WORKING CAPITAL PAYMENTS ───────────────────
  // These are loan repayments, classified as expense
  await addTx({
    externalId: "seed_exp_2026-03_pp_workcap",
    date: "2026-03-15",
    amount: -1625.42,
    description: "PayPal Working Capital repayments — March 2026",
    type: "EXPENSE",
    source: "PAYPAL",
    vendor: "PayPal Working Capital",
    categoryName: "Fees",
  });

  // ─── AMEX *3813 EXPENSES ───────────────────────────────
  await addTx({
    externalId: "seed_exp_2026-03_amex_epayment",
    date: "2026-03-13",
    amount: -661.00,
    description: "Amex ePayment — credit card payment",
    type: "EXPENSE",
    source: "AMEX",
    categoryName: "Fees",
  });

  // ─── RENT / CHURCH (recurring large payments) ──────────
  // Trailhead Church payments from *0045
  const churchPayments = [
    { id: "church1", date: "2026-03-05", amount: 1686.30 },
    { id: "church2", date: "2026-03-10", amount: 37.81 },
    { id: "church3", date: "2026-03-15", amount: 112.42 },
    { id: "church4", date: "2026-03-17", amount: 66.43 },
    { id: "church5", date: "2026-03-24", amount: 91.98 },
    { id: "church6", date: "2026-03-24", amount: 91.98 },
  ];
  // Also from *3813
  const church3813 = [
    { id: "church3813_1", date: "2026-03-01", amount: 15.33 },
  ];

  for (const c of [...churchPayments, ...church3813]) {
    await addTx({
      externalId: `seed_exp_2026-03_${c.id}`,
      date: c.date,
      amount: -c.amount,
      description: "Trailhead Church",
      type: "EXPENSE",
      source: "AMEX",
      vendor: "Trailhead Church",
      categoryName: "Rent",
    });
  }

  // ─── CITY UTILITIES ────────────────────────────────────
  await addTx({
    externalId: "seed_exp_2026-03_cityutil",
    date: "2026-03-19",
    amount: -153.37,
    description: "City of Burlington — utilities",
    type: "EXPENSE",
    source: "PAYPAL",
    vendor: "City of Burlington",
    categoryName: "Rent",
  });

  // ─── DUKE ENERGY ───────────────────────────────────────
  await addTx({
    externalId: "seed_exp_2026-03_duke",
    date: "2026-03-05",
    amount: -1926.55,
    description: "Duke Energy",
    type: "EXPENSE",
    source: "AMEX",
    vendor: "Duke Energy",
    categoryName: "Rent",
  });

  // ─── NC ZOO (family/personal) ──────────────────────────
  await addTx({
    externalId: "seed_exp_2026-03_zoo",
    date: "2026-03-17",
    amount: -205.00,
    description: "NC Zoo Society",
    type: "EXPENSE",
    source: "AMEX",
    vendor: "NC Zoo Society",
  });

  // ─── CONTRACTORS ───────────────────────────────────────
  // PayPal payments sent minus Working Capital = actual contractor payments
  // General payment total was $1,693.54 but most is Working Capital ($1,625.42)
  // Remaining $68.12 is bill payments (Roku, SaneBox already counted above)
  // No separate contractor line items visible — skip or mark as $0

  console.log(`\n🎉 March 2026 seed complete: ${created} created, ${skipped} skipped\n`);
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
