/**
 * Seed script: migrates the hardcoded monthlySummary.ts data into the Transaction table.
 *
 * Run with:  npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DetailItem = { label: string; amount: number };

type MonthlySummary = {
  month: string;
  monthKey: string;
  grossRevenue: number;
  fees: number;
  netRevenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  revenueSources: {
    paypal: number;
    youtube: number;
    stripe: number;
    paymentsAi: number;
    substack: number;
  };
  expenseBreakdown: {
    software: number;
    contractors: number;
    rent: number;
    fees: number;
    unmapped: number;
  };
  expenseDetails: {
    software: DetailItem[];
    contractors: DetailItem[];
    rent: DetailItem[];
    fees: DetailItem[];
    unmapped: DetailItem[];
  };
};

// Pasted from monthlySummary.ts
const monthlySummary: MonthlySummary[] = [
  {
    month: "March", monthKey: "2025-03", grossRevenue: 4225.47, fees: -175.52,
    netRevenue: 4049.95, expenses: 809.28, netProfit: 3240.67, profitMargin: 0.7669371691,
    revenueSources: { paypal: 2425.47, youtube: 0, stripe: 1800.0, paymentsAi: 0, substack: 0 },
    expenseBreakdown: { software: 407.02, contractors: 0, rent: 0, fees: 175.52, unmapped: 226.74 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 407.02 }], contractors: [], rent: [],
      fees: [{ label: "Merchant / Processing Fees", amount: 175.52 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: 226.74 }],
    },
  },
  {
    month: "April", monthKey: "2025-04", grossRevenue: 4460.63, fees: -225.42,
    netRevenue: 4311.77, expenses: 580.77, netProfit: 3731.0, profitMargin: 0.8364289349,
    revenueSources: { paypal: 2400.0, youtube: 0, stripe: 2060.63, paymentsAi: 0, substack: 0 },
    expenseBreakdown: { software: 346.89, contractors: 105.5, rent: 0, fees: 225.42, unmapped: -97.04 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 346.89 }],
      contractors: [{ label: "Contractors", amount: 105.5 }], rent: [],
      fees: [{ label: "Merchant / Processing Fees", amount: 225.42 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: -97.04 }],
    },
  },
  {
    month: "May", monthKey: "2025-05", grossRevenue: 3061.4, fees: -160.23,
    netRevenue: 2976.5, expenses: 1822.74, netProfit: 1153.76, profitMargin: 0.3768733259,
    revenueSources: { paypal: 1608.77, youtube: 0, stripe: 1452.63, paymentsAi: 0, substack: 0 },
    expenseBreakdown: { software: 717.96, contractors: 233.88, rent: 0, fees: 160.23, unmapped: 710.67 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 717.96 }],
      contractors: [{ label: "Contractors", amount: 233.88 }], rent: [],
      fees: [{ label: "Merchant / Processing Fees", amount: 160.23 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: 710.67 }],
    },
  },
  {
    month: "June", monthKey: "2025-06", grossRevenue: 1756.58, fees: -144.08,
    netRevenue: 1714.82, expenses: 1536.75, netProfit: 178.07, profitMargin: 0.1013731228,
    revenueSources: { paypal: 600.0, youtube: 0, stripe: 1156.58, paymentsAi: 0, substack: 0 },
    expenseBreakdown: { software: 793.96, contractors: 938.38, rent: 0, fees: 144.08, unmapped: -339.67 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 793.96 }],
      contractors: [{ label: "Contractors", amount: 938.38 }], rent: [],
      fees: [{ label: "Merchant / Processing Fees", amount: 144.08 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: -339.67 }],
    },
  },
  {
    month: "July", monthKey: "2025-07", grossRevenue: 8627.59, fees: -456.63,
    netRevenue: 8421.86, expenses: 1608.77, netProfit: 6813.09, profitMargin: 0.7896863435,
    revenueSources: { paypal: 4500.0, youtube: 0, stripe: 4127.59, paymentsAi: 0, substack: 0 },
    expenseBreakdown: { software: 1000.7, contractors: 938.38, rent: 0, fees: 456.63, unmapped: -786.94 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 1000.7 }],
      contractors: [{ label: "Contractors", amount: 938.38 }], rent: [],
      fees: [{ label: "Merchant / Processing Fees", amount: 456.63 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: -786.94 }],
    },
  },
  {
    month: "August", monthKey: "2025-08", grossRevenue: 10243.32, fees: -515.38,
    netRevenue: 9943.17, expenses: 5872.05, netProfit: 4071.12, profitMargin: 0.3974414545,
    revenueSources: { paypal: 6830.0, youtube: 0, stripe: 2800.0, paymentsAi: 0, substack: 613.32 },
    expenseBreakdown: { software: 1095.16, contractors: 1220.31, rent: 1950.0, fees: 515.38, unmapped: 1091.2 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 1095.16 }],
      contractors: [{ label: "Contractors", amount: 1220.31 }],
      rent: [{ label: "Rent", amount: 1950.0 }],
      fees: [{ label: "Merchant / Processing Fees", amount: 515.38 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: 1091.2 }],
    },
  },
  {
    month: "September", monthKey: "2025-09", grossRevenue: 4492.1, fees: -515.38,
    netRevenue: 4191.95, expenses: 3581.62, netProfit: 610.33, profitMargin: 0.1358674117,
    revenueSources: { paypal: 1500.0, youtube: 0, stripe: 2646.05, paymentsAi: 0, substack: 346.05 },
    expenseBreakdown: { software: 1422.91, contractors: 1220.31, rent: 0, fees: 515.38, unmapped: 422.99 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 1422.91 }],
      contractors: [{ label: "Contractors", amount: 1220.31 }], rent: [],
      fees: [{ label: "Merchant / Processing Fees", amount: 515.38 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: 422.99 }],
    },
  },
  {
    month: "October", monthKey: "2025-10", grossRevenue: 8128.65, fees: -253.19,
    netRevenue: 8032.41, expenses: 2770.98, netProfit: 5261.43, profitMargin: 0.6472698419,
    revenueSources: { paypal: 2180.22, youtube: 0, stripe: 3888.0, paymentsAi: 1794.0, substack: 266.43 },
    expenseBreakdown: { software: 1306.81, contractors: 1220.31, rent: 650.0, fees: 253.19, unmapped: -659.33 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 1306.81 }],
      contractors: [{ label: "Contractors", amount: 1220.31 }],
      rent: [{ label: "Rent", amount: 650.0 }],
      fees: [{ label: "Merchant / Processing Fees", amount: 253.19 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: -659.33 }],
    },
  },
  {
    month: "November", monthKey: "2025-11", grossRevenue: 22865.31, fees: -759.19,
    netRevenue: 22581.14, expenses: 4592.59, netProfit: 17988.55, profitMargin: 0.7867179583,
    revenueSources: { paypal: 9708.98, youtube: 0, stripe: 9455.0, paymentsAi: 2580.59, substack: 1120.74 },
    expenseBreakdown: { software: 2228.21, contractors: 1202.0, rent: 650.0, fees: 759.19, unmapped: -246.81 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 2228.21 }],
      contractors: [{ label: "Contractors", amount: 1202.0 }],
      rent: [{ label: "Rent", amount: 650.0 }],
      fees: [{ label: "Merchant / Processing Fees", amount: 759.19 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: -246.81 }],
    },
  },
  {
    month: "December", monthKey: "2025-12", grossRevenue: 21122.62, fees: -769.41,
    netRevenue: 20852.26, expenses: 5004.61, netProfit: 15847.65, profitMargin: 0.7502691427,
    revenueSources: { paypal: 6519.62, youtube: 776.0, stripe: 10770.0, paymentsAi: 2446.0, substack: 611.0 },
    expenseBreakdown: { software: 3651.53, contractors: 1711.66, rent: 650.0, fees: 769.41, unmapped: -1778.0 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 3651.53 }],
      contractors: [{ label: "Contractors", amount: 1711.66 }],
      rent: [{ label: "Rent", amount: 650.0 }],
      fees: [{ label: "Merchant / Processing Fees", amount: 769.41 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: -1778.0 }],
    },
  },
  {
    month: "January", monthKey: "2026-01", grossRevenue: 12433.24, fees: -513.29,
    netRevenue: 12129.19, expenses: 4932.94, netProfit: 7196.25, profitMargin: 0.5787912081,
    revenueSources: { paypal: 6187.42, youtube: 776.0, stripe: 5288.0, paymentsAi: 0, substack: 181.82 },
    expenseBreakdown: { software: 2546.8, contractors: 1849.88, rent: 650.0, fees: 513.29, unmapped: -627.03 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 2546.8 }],
      contractors: [{ label: "Contractors", amount: 1849.88 }],
      rent: [{ label: "Rent", amount: 650.0 }],
      fees: [{ label: "Merchant / Processing Fees", amount: 513.29 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: -627.03 }],
    },
  },
  {
    month: "February", monthKey: "2026-02", grossRevenue: 6541.41, fees: -269.07,
    netRevenue: 6403.07, expenses: 3401.03, netProfit: 3002.04, profitMargin: 0.4589285796,
    revenueSources: { paypal: 2926.22, youtube: 478.61, stripe: 2797.29, paymentsAi: 0, substack: 339.29 },
    expenseBreakdown: { software: 1426.29, contractors: 934.41, rent: 650.0, fees: 269.07, unmapped: 121.26 },
    expenseDetails: {
      software: [{ label: "Software / Tools", amount: 1426.29 }],
      contractors: [{ label: "Contractors", amount: 934.41 }],
      rent: [{ label: "Rent", amount: 650.0 }],
      fees: [{ label: "Merchant / Processing Fees", amount: 269.07 }],
      unmapped: [{ label: "Needs category mapping from spreadsheet", amount: 121.26 }],
    },
  },
];

// ─── Source mapping ──────────────────────────────────────
const SOURCE_MAP: Record<string, "STRIPE" | "PAYPAL" | "YOUTUBE" | "SUBSTACK" | "MANUAL"> = {
  stripe: "STRIPE",
  paypal: "PAYPAL",
  youtube: "YOUTUBE",
  substack: "SUBSTACK",
  paymentsAi: "MANUAL", // No dedicated enum for Payments AI — mark as MANUAL
};

// ─── Category seeding ────────────────────────────────────
const EXPENSE_CATEGORIES = ["Software", "Contractors", "Rent", "Fees", "Unmapped"];

async function main() {
  console.log("🌱 Starting seed...\n");

  // 1. Create categories
  console.log("Creating categories...");
  for (const name of EXPENSE_CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, group: "expense" },
    });
  }
  const categories = await prisma.category.findMany();
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  console.log(`  ✓ ${categories.length} categories ready\n`);

  // 2. Seed transactions from monthly summaries
  let totalCreated = 0;
  let totalSkipped = 0;

  for (const ms of monthlySummary) {
    const dateMid = new Date(`${ms.monthKey}-15T12:00:00Z`);
    console.log(`Processing ${ms.month} ${ms.monthKey}...`);

    // --- Revenue transactions ---
    for (const [key, amount] of Object.entries(ms.revenueSources)) {
      if (amount <= 0) continue;
      const source = SOURCE_MAP[key];
      if (!source) continue;

      const externalId = `seed_rev_${ms.monthKey}_${key}`;
      const existing = await prisma.transaction.findUnique({ where: { externalId } });

      if (existing) {
        totalSkipped++;
        continue;
      }

      await prisma.transaction.create({
        data: {
          date: dateMid,
          amount: amount.toString(),
          description: `${key.charAt(0).toUpperCase() + key.slice(1)} revenue — ${ms.month} ${ms.monthKey.slice(0, 4)}`,
          vendor: key,
          currency: "USD",
          type: "INCOME",
          source,
          businessUnit: "COMBINED",
          monthKey: ms.monthKey,
          externalId,
          raw: { seedSource: "monthlySummary", key, monthKey: ms.monthKey },
        },
      });
      totalCreated++;
    }

    // --- Fee transaction ---
    if (ms.fees !== 0) {
      const feeExtId = `seed_fee_${ms.monthKey}`;
      const existing = await prisma.transaction.findUnique({ where: { externalId: feeExtId } });

      if (!existing) {
        await prisma.transaction.create({
          data: {
            date: dateMid,
            amount: ms.fees.toString(), // already negative
            description: `Processing fees — ${ms.month} ${ms.monthKey.slice(0, 4)}`,
            currency: "USD",
            type: "FEE",
            source: "MANUAL",
            businessUnit: "COMBINED",
            monthKey: ms.monthKey,
            externalId: feeExtId,
            categoryId: catMap["Fees"],
            raw: { seedSource: "monthlySummary", type: "fees", monthKey: ms.monthKey },
          },
        });
        totalCreated++;
      } else {
        totalSkipped++;
      }
    }

    // --- Expense transactions ---
    const expenseKeys: (keyof typeof ms.expenseBreakdown)[] = [
      "software",
      "contractors",
      "rent",
      "unmapped",
    ];

    for (const key of expenseKeys) {
      const amount = ms.expenseBreakdown[key];
      if (amount === 0) continue;
      // fees handled separately above
      if (key === "fees") continue;

      const catName = key.charAt(0).toUpperCase() + key.slice(1);
      const externalId = `seed_exp_${ms.monthKey}_${key}`;
      const existing = await prisma.transaction.findUnique({ where: { externalId } });

      if (existing) {
        totalSkipped++;
        continue;
      }

      // Get detail items for the description
      const details = ms.expenseDetails[key as keyof typeof ms.expenseDetails] || [];
      const desc = details.length > 0
        ? details.map((d) => d.label).join(", ")
        : `${catName} expenses`;

      await prisma.transaction.create({
        data: {
          date: dateMid,
          amount: (-Math.abs(amount)).toString(),
          description: `${desc} — ${ms.month} ${ms.monthKey.slice(0, 4)}`,
          currency: "USD",
          type: "EXPENSE",
          source: "MANUAL",
          businessUnit: "COMBINED",
          monthKey: ms.monthKey,
          externalId,
          categoryId: catMap[catName] || catMap["Unmapped"],
          raw: { seedSource: "monthlySummary", type: key, monthKey: ms.monthKey },
        },
      });
      totalCreated++;
    }

    console.log(`  ✓ ${ms.month} done`);
  }

  console.log(`\n🎉 Seed complete: ${totalCreated} transactions created, ${totalSkipped} skipped (already exist)\n`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
