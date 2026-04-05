import { prisma } from "./prisma";

type Rule = {
  id: string;
  priority: number;
  sourceSystem: string | null;
  matchField: string;
  matchType: string;
  matchValue: string;
  category: string;
  subcategory: string | null;
  subtype: string | null;
  txType: string | null;
  isIgnored: boolean;
  isOneTime: boolean;
  isBusinessRelevant: boolean;
};

/**
 * Load all active rules sorted by priority (lower = higher priority)
 */
async function loadRules(): Promise<Rule[]> {
  return prisma.categorizationRule.findMany({
    where: { active: true },
    orderBy: { priority: "asc" },
  });
}

/**
 * Match a single transaction against a rule
 */
function matchesRule(
  rule: Rule,
  tx: { description: string; vendor: string | null; source: string }
): boolean {
  // Check source filter
  if (rule.sourceSystem && rule.sourceSystem !== tx.source) return false;

  // Get field to match against
  let fieldValue = "";
  switch (rule.matchField) {
    case "description":
      fieldValue = tx.description;
      break;
    case "vendor":
      fieldValue = tx.vendor || tx.description;
      break;
    default:
      fieldValue = tx.description;
  }

  const lower = fieldValue.toLowerCase();
  const matchLower = rule.matchValue.toLowerCase();

  switch (rule.matchType) {
    case "exact":
      return lower === matchLower;
    case "contains":
      return lower.includes(matchLower);
    case "regex":
      try {
        return new RegExp(rule.matchValue, "i").test(fieldValue);
      } catch {
        return false;
      }
    default:
      return lower.includes(matchLower);
  }
}

/**
 * Categorize a single transaction — returns the matching rule or null
 */
export function findMatchingRule(
  rules: Rule[],
  tx: { description: string; vendor: string | null; source: string }
): Rule | null {
  for (const rule of rules) {
    if (matchesRule(rule, tx)) return rule;
  }
  return null;
}

/**
 * Apply categorization rules to all uncategorized transactions,
 * or re-run on all non-manually-overridden transactions.
 */
export async function categorizeTransactions(opts?: {
  monthKey?: string;
  force?: boolean; // re-categorize even if already categorized (but not manual overrides)
}): Promise<{ categorized: number; uncategorized: number }> {
  const rules = await loadRules();

  const where: any = {};
  if (opts?.monthKey) where.monthKey = opts.monthKey;
  if (!opts?.force) {
    // Only categorize transactions without a subcategory set
    where.subcategory = null;
  }
  // Never override manual classifications
  where.manualOverride = false;

  const transactions = await prisma.transaction.findMany({ where });

  let categorized = 0;
  let uncategorized = 0;

  for (const tx of transactions) {
    const rule = findMatchingRule(rules, {
      description: tx.description,
      vendor: tx.vendor,
      source: tx.source,
    });

    if (rule) {
      const update: any = {
        subcategory: rule.subcategory || rule.category,
        subtype: rule.subtype,
        isIgnored: rule.isIgnored,
        isOneTime: rule.isOneTime,
        isBusinessRelevant: rule.isBusinessRelevant,
        ruleIdApplied: rule.id,
      };

      // Override transaction type if rule specifies
      if (rule.txType) {
        update.type = rule.txType;
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: update,
      });
      categorized++;
    } else {
      uncategorized++;
    }
  }

  return { categorized, uncategorized };
}

/**
 * Seed the default categorization rules based on Casey's known vendors
 */
export async function seedDefaultRules(): Promise<number> {
  const existing = await prisma.categorizationRule.count();
  if (existing > 0) return 0; // Don't re-seed if rules exist

  const rules: Omit<Rule, "id">[] = [
    // ─── REVENUE RULES ────────────────────────────────
    { priority: 10, sourceSystem: "PAYPAL", matchField: "description", matchType: "contains", matchValue: "Mass Pay", category: "Revenue", subcategory: "Content", subtype: "YouTube", txType: "INCOME", isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 10, sourceSystem: "PAYPAL", matchField: "description", matchType: "contains", matchValue: "Website Payment", category: "Revenue", subcategory: "Sales", subtype: "Website", txType: "INCOME", isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 10, sourceSystem: "PAYPAL", matchField: "description", matchType: "contains", matchValue: "Subscription Payment", category: "Revenue", subcategory: "Recurring", subtype: "Subscription", txType: "INCOME", isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 10, sourceSystem: "STRIPE", matchField: "description", matchType: "contains", matchValue: "Course Member", category: "Revenue", subcategory: "Sales", subtype: "Course", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 10, sourceSystem: "STRIPE", matchField: "description", matchType: "contains", matchValue: "Freedom Income Engine", category: "Revenue", subcategory: "Recurring", subtype: "Subscription", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 10, sourceSystem: "STRIPE", matchField: "description", matchType: "contains", matchValue: "Roadmap Implementation", category: "Revenue", subcategory: "Recurring", subtype: "Subscription", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 10, sourceSystem: "STRIPE", matchField: "description", matchType: "contains", matchValue: "Freedom Execution Alerts", category: "Revenue", subcategory: "Recurring", subtype: "Subscription", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },

    // ─── FEE RULES ─────────────────────────────────────
    { priority: 20, sourceSystem: "STRIPE", matchField: "description", matchType: "contains", matchValue: "processing fee", category: "Fees", subcategory: "Processing", subtype: "Stripe", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 20, sourceSystem: "PAYPAL", matchField: "description", matchType: "contains", matchValue: "fee", category: "Fees", subcategory: "Processing", subtype: "PayPal", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },

    // ─── IGNORED / TRANSFER RULES ──────────────────────
    { priority: 5, sourceSystem: "PAYPAL", matchField: "description", matchType: "contains", matchValue: "Working Capital", category: "Financing", subcategory: "Loan", subtype: "PayPal WC", txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "ATM Cash Withdrawal", category: "Transfer", subcategory: "Owner Draw", subtype: "ATM", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "STRIPE TRANSFER", category: "Transfer", subcategory: "Settlement", subtype: "Stripe Payout", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "PAYPAL TRANSFER", category: "Transfer", subcategory: "Settlement", subtype: "PayPal Payout", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "American Express TRANSFER", category: "Transfer", subcategory: "Internal", subtype: "Account Transfer", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "SCHWAB BROKERAGE", category: "Transfer", subcategory: "Investment", subtype: "Schwab", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "AFFIRM", category: "Financing", subcategory: "Loan", subtype: "Affirm", txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "CHASE CREDIT CRD", category: "Transfer", subcategory: "CC Payment", subtype: "Chase", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "DISCOVER E-PAYMENT", category: "Transfer", subcategory: "CC Payment", subtype: "Discover", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 5, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "AMEX EPAYMENT", category: "Transfer", subcategory: "CC Payment", subtype: "Amex", txType: "TRANSFER", isIgnored: true, isOneTime: false, isBusinessRelevant: false },

    // ─── SOFTWARE / TOOLS ──────────────────────────────
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "WPENGINE", category: "Expense", subcategory: "Software", subtype: "Hosting", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "BLUEHOST", category: "Expense", subcategory: "Software", subtype: "Hosting", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "RAILWAY", category: "Expense", subcategory: "Software", subtype: "Hosting", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "OPENAI", category: "Expense", subcategory: "Software", subtype: "AI", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "ANTHROPIC", category: "Expense", subcategory: "Software", subtype: "AI", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "CLAUDE", category: "Expense", subcategory: "Software", subtype: "AI", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "CANVA", category: "Expense", subcategory: "Software", subtype: "Design", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "POSTMARK", category: "Expense", subcategory: "Software", subtype: "Email", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "ZENDESK", category: "Expense", subcategory: "Software", subtype: "Support", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "MAKE.COM", category: "Expense", subcategory: "Software", subtype: "Automation", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "RIVERSIDE", category: "Expense", subcategory: "Software", subtype: "Video", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "DESCRIPT", category: "Expense", subcategory: "Software", subtype: "Video", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "VIDIQ", category: "Expense", subcategory: "Software", subtype: "YouTube", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "BUZZSPROUT", category: "Expense", subcategory: "Software", subtype: "Podcast", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "ADOBE", category: "Expense", subcategory: "Software", subtype: "Design", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "SANEBOX", category: "Expense", subcategory: "Software", subtype: "Email", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "PDFMONKEY", category: "Expense", subcategory: "Software", subtype: "Tools", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "FINANCIALMODELING", category: "Expense", subcategory: "Software", subtype: "Data", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "NINJATRADER", category: "Expense", subcategory: "Software", subtype: "Trading", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "ADAPTIVE COMPUTER", category: "Expense", subcategory: "Software", subtype: "AI", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "GOOGLE *WORKSPACE", category: "Expense", subcategory: "Software", subtype: "Productivity", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "GOOGLE *Google One", category: "Expense", subcategory: "Software", subtype: "Storage", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "X DEVELOPER", category: "Expense", subcategory: "Software", subtype: "Social", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "X CORP", category: "Expense", subcategory: "Software", subtype: "Social", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "RUMBLE", category: "Expense", subcategory: "Software", subtype: "Video", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 50, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "ROEZAN", category: "Expense", subcategory: "Software", subtype: "SMS", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },

    // ─── UTILITIES ─────────────────────────────────────
    { priority: 60, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "TMOBILE", category: "Expense", subcategory: "Utilities", subtype: "Phone", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 60, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "T-Mobile", category: "Expense", subcategory: "Utilities", subtype: "Phone", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 60, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "DUKE ENERGY", category: "Expense", subcategory: "Utilities", subtype: "Electric", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },
    { priority: 60, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "City of Burlington", category: "Expense", subcategory: "Utilities", subtype: "Water", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },

    // ─── RENT ──────────────────────────────────────────
    { priority: 55, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "TRAILHEAD CHURCH", category: "Expense", subcategory: "Rent", subtype: "Office", txType: null, isIgnored: false, isOneTime: false, isBusinessRelevant: true },

    // ─── PERSONAL / GROCERIES (ignore from P&L) ────────
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "FOOD LION", category: "Personal", subcategory: "Groceries", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "DOLLAR GENERAL", category: "Personal", subcategory: "Groceries", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "WAL-MART", category: "Personal", subcategory: "Groceries", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "WALMART", category: "Personal", subcategory: "Groceries", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "MCDONALD", category: "Personal", subcategory: "Food", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "DOMINO", category: "Personal", subcategory: "Food", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "BURGER KING", category: "Personal", subcategory: "Food", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "TACO BELL", category: "Personal", subcategory: "Food", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "DAIRY QUEEN", category: "Personal", subcategory: "Food", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "SHEETZ", category: "Personal", subcategory: "Gas", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "INGLES", category: "Personal", subcategory: "Groceries", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "HARRIS TEETER", category: "Personal", subcategory: "Groceries", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "GREAT CLIPS", category: "Personal", subcategory: "Personal Care", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "CVS/PHARMACY", category: "Personal", subcategory: "Health", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "LOWE'S", category: "Personal", subcategory: "Home", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "HOME DEPOT", category: "Personal", subcategory: "Home", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "AMAZON", category: "Personal", subcategory: "Shopping", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "ROKU", category: "Personal", subcategory: "Entertainment", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "PRIME VIDEO", category: "Personal", subcategory: "Entertainment", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "NC ZOO", category: "Personal", subcategory: "Entertainment", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "GOODWILL", category: "Personal", subcategory: "Shopping", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "FAMILY DOLLAR", category: "Personal", subcategory: "Groceries", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "FULLSCRIPT", category: "Personal", subcategory: "Health", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
    { priority: 70, sourceSystem: null, matchField: "description", matchType: "contains", matchValue: "APEX HOSTI", category: "Personal", subcategory: "Gaming", subtype: null, txType: null, isIgnored: true, isOneTime: false, isBusinessRelevant: false },
  ];

  await prisma.categorizationRule.createMany({
    data: rules as any[],
  });

  return rules.length;
}
