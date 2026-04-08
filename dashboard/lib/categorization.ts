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

async function loadRules(): Promise<Rule[]> {
  return prisma.categorizationRule.findMany({
    where: { active: true },
    orderBy: { priority: "asc" },
  });
}

function matchesRule(rule: Rule, tx: { description: string; vendor: string | null; source: string }): boolean {
  if (rule.sourceSystem && rule.sourceSystem !== tx.source) return false;
  let field = rule.matchField === "vendor" ? (tx.vendor || tx.description) : tx.description;
  const lower = field.toLowerCase();
  const matchLower = rule.matchValue.toLowerCase();
  switch (rule.matchType) {
    case "exact": return lower === matchLower;
    case "contains": return lower.includes(matchLower);
    case "regex": try { return new RegExp(rule.matchValue, "i").test(field); } catch { return false; }
    default: return lower.includes(matchLower);
  }
}

export function findMatchingRule(rules: Rule[], tx: { description: string; vendor: string | null; source: string }): Rule | null {
  for (const rule of rules) { if (matchesRule(rule, tx)) return rule; }
  return null;
}

export async function categorizeTransactions(opts?: { monthKey?: string; force?: boolean }): Promise<{ categorized: number; uncategorized: number }> {
  const rules = await loadRules();
  const where: any = {};
  if (opts?.monthKey) where.monthKey = opts.monthKey;
  if (!opts?.force) where.subcategory = null;
  where.manualOverride = false;

  const transactions = await prisma.transaction.findMany({ where });
  let categorized = 0, uncategorized = 0;

  for (const tx of transactions) {
    const rule = findMatchingRule(rules, { description: tx.description, vendor: tx.vendor, source: tx.source });
    if (rule) {
      const update: any = {
        subcategory: rule.subcategory || rule.category,
        subtype: rule.subtype,
        isIgnored: rule.isIgnored,
        isOneTime: rule.isOneTime,
        isBusinessRelevant: rule.isBusinessRelevant,
        ruleIdApplied: rule.id,
      };
      if (rule.txType) update.type = rule.txType;
      await prisma.transaction.update({ where: { id: tx.id }, data: update });
      categorized++;
    } else { uncategorized++; }
  }
  return { categorized, uncategorized };
}

// 156 rules from Casey's spreadsheet + bank statement analysis
const DEFAULT_RULES: { mv: string; cat: string; sub: string; st: string | null; ign: boolean; biz: boolean; one: boolean }[] = [
  // Equipment
  {mv:"Desk",cat:"Expense",sub:"Equipment",st:"Furniture",ign:false,biz:true,one:true},
  {mv:"Teleprompter",cat:"Expense",sub:"Equipment",st:"Video",ign:false,biz:true,one:true},
  {mv:"Bestbuy",cat:"Expense",sub:"Equipment",st:"Tech",ign:false,biz:true,one:true},
  // Contractors
  {mv:"Upwork",cat:"Expense",sub:"Contractors",st:"Freelance",ign:false,biz:true,one:false},
  {mv:"Fiver",cat:"Expense",sub:"Contractors",st:"Freelance",ign:false,biz:true,one:false},
  {mv:"Fiverr",cat:"Expense",sub:"Contractors",st:"Freelance",ign:false,biz:true,one:false},
  {mv:"Niel Farrimond",cat:"Expense",sub:"Contractors",st:"Video",ign:false,biz:true,one:false},
  {mv:"Reena",cat:"Expense",sub:"Contractors",st:"Referral",ign:false,biz:true,one:false},
  {mv:"Funnel Cures",cat:"Expense",sub:"Contractors",st:"Marketing",ign:false,biz:true,one:false},
  {mv:"Courtney",cat:"Expense",sub:"Contractors",st:"Ops",ign:false,biz:true,one:false},
  {mv:"Podcast booking",cat:"Expense",sub:"Contractors",st:"Marketing",ign:false,biz:true,one:false},
  {mv:"WEB DESIGN",cat:"Expense",sub:"Contractors",st:"Web Design",ign:false,biz:true,one:true},
  {mv:"Meza Services",cat:"Expense",sub:"Contractors",st:"Services",ign:false,biz:true,one:false},
  {mv:"AOJANCE",cat:"Expense",sub:"Contractors",st:"Services",ign:false,biz:true,one:false},
  // Software
  {mv:"Riverside",cat:"Expense",sub:"Software",st:"Video",ign:false,biz:true,one:false},
  {mv:"Ground Hogg",cat:"Expense",sub:"Software",st:"CRM",ign:false,biz:true,one:true},
  {mv:"GROUNDHOGG",cat:"Expense",sub:"Software",st:"CRM",ign:false,biz:true,one:true},
  {mv:"Edgeful",cat:"Expense",sub:"Software",st:"Trading",ign:false,biz:true,one:false},
  {mv:"vidiq",cat:"Expense",sub:"Software",st:"YouTube",ign:false,biz:true,one:false},
  {mv:"canva",cat:"Expense",sub:"Software",st:"Design",ign:false,biz:true,one:false},
  {mv:"FMP Data",cat:"Expense",sub:"Software",st:"Data",ign:false,biz:true,one:false},
  {mv:"FINANCIALMODELING",cat:"Expense",sub:"Software",st:"Data",ign:false,biz:true,one:false},
  {mv:"Typefully",cat:"Expense",sub:"Software",st:"Social",ign:false,biz:true,one:false},
  {mv:"unbounce",cat:"Expense",sub:"Software",st:"Landing Pages",ign:false,biz:true,one:false},
  {mv:"Chatgpt",cat:"Expense",sub:"Software",st:"AI",ign:false,biz:true,one:false},
  {mv:"Gamma",cat:"Expense",sub:"Software",st:"Presentations",ign:false,biz:true,one:true},
  {mv:"Sanebox",cat:"Expense",sub:"Software",st:"Email",ign:false,biz:true,one:false},
  {mv:"opusclip",cat:"Expense",sub:"Software",st:"Video",ign:false,biz:true,one:false},
  {mv:"WPengine",cat:"Expense",sub:"Software",st:"Hosting",ign:false,biz:true,one:false},
  {mv:"WPENGINE",cat:"Expense",sub:"Software",st:"Hosting",ign:false,biz:true,one:false},
  {mv:"OPENAI",cat:"Expense",sub:"Software",st:"AI",ign:false,biz:true,one:false},
  {mv:"Open AI",cat:"Expense",sub:"Software",st:"AI",ign:false,biz:true,one:false},
  {mv:"Zapier",cat:"Expense",sub:"Software",st:"Automation",ign:false,biz:true,one:false},
  {mv:"Calendly",cat:"Expense",sub:"Software",st:"Scheduling",ign:false,biz:true,one:false},
  {mv:"Postmark",cat:"Expense",sub:"Software",st:"Email",ign:false,biz:true,one:false},
  {mv:"POSTMARK",cat:"Expense",sub:"Software",st:"Email",ign:false,biz:true,one:false},
  {mv:"Credit Repair",cat:"Expense",sub:"Software",st:"Finance",ign:false,biz:true,one:false},
  {mv:"Buzzsprout",cat:"Expense",sub:"Software",st:"Podcast",ign:false,biz:true,one:false},
  {mv:"Memberpress",cat:"Expense",sub:"Software",st:"Membership",ign:false,biz:true,one:false},
  {mv:"Roezan",cat:"Expense",sub:"Software",st:"SMS",ign:false,biz:true,one:false},
  {mv:"ROEZAN",cat:"Expense",sub:"Software",st:"SMS",ign:false,biz:true,one:false},
  {mv:"zoom",cat:"Expense",sub:"Software",st:"Video Calls",ign:false,biz:true,one:false},
  {mv:"ZOOM",cat:"Expense",sub:"Software",st:"Video Calls",ign:false,biz:true,one:false},
  {mv:"Link Tree",cat:"Expense",sub:"Software",st:"Social",ign:false,biz:true,one:false},
  {mv:"LINKTREE",cat:"Expense",sub:"Software",st:"Social",ign:false,biz:true,one:false},
  {mv:"Click Funnels",cat:"Expense",sub:"Software",st:"Funnels",ign:false,biz:true,one:false},
  {mv:"CLICKFUNNELS",cat:"Expense",sub:"Software",st:"Funnels",ign:false,biz:true,one:false},
  {mv:"Payments AI",cat:"Expense",sub:"Software",st:"Payments",ign:false,biz:true,one:false},
  {mv:"Zendesk",cat:"Expense",sub:"Software",st:"Support",ign:false,biz:true,one:false},
  {mv:"ZENDESK",cat:"Expense",sub:"Software",st:"Support",ign:false,biz:true,one:false},
  {mv:"Adobe",cat:"Expense",sub:"Software",st:"Design",ign:false,biz:true,one:false},
  {mv:"ADOBE",cat:"Expense",sub:"Software",st:"Design",ign:false,biz:true,one:false},
  {mv:"Railway",cat:"Expense",sub:"Software",st:"Hosting",ign:false,biz:true,one:false},
  {mv:"RAILWAY",cat:"Expense",sub:"Software",st:"Hosting",ign:false,biz:true,one:false},
  {mv:"Sales Message",cat:"Expense",sub:"Software",st:"SMS",ign:false,biz:true,one:false},
  {mv:"Options Samurai",cat:"Expense",sub:"Software",st:"Trading",ign:false,biz:true,one:false},
  {mv:"X CORP",cat:"Expense",sub:"Software",st:"Social",ign:false,biz:true,one:false},
  {mv:"X DEVELOPER",cat:"Expense",sub:"Software",st:"Social",ign:false,biz:true,one:false},
  {mv:"GOOGLE *Google One",cat:"Expense",sub:"Software",st:"Storage",ign:false,biz:true,one:false},
  {mv:"Google Drive",cat:"Expense",sub:"Software",st:"Storage",ign:false,biz:true,one:false},
  {mv:"GOOGLE *WORKSPACE",cat:"Expense",sub:"Software",st:"Productivity",ign:false,biz:true,one:false},
  {mv:"Meta Trader",cat:"Expense",sub:"Software",st:"Trading",ign:false,biz:true,one:false},
  {mv:"NINJATRADER",cat:"Expense",sub:"Software",st:"Trading",ign:false,biz:true,one:false},
  {mv:"MAKE.COM",cat:"Expense",sub:"Software",st:"Automation",ign:false,biz:true,one:false},
  {mv:"BLUEHOST",cat:"Expense",sub:"Software",st:"Hosting",ign:false,biz:true,one:false},
  {mv:"CLAUDE",cat:"Expense",sub:"Software",st:"AI",ign:false,biz:true,one:false},
  {mv:"ANTHROPIC",cat:"Expense",sub:"Software",st:"AI",ign:false,biz:true,one:false},
  {mv:"ADAPTIVE COMPUTER",cat:"Expense",sub:"Software",st:"AI",ign:false,biz:true,one:false},
  {mv:"DESCRIPT",cat:"Expense",sub:"Software",st:"Video",ign:false,biz:true,one:false},
  {mv:"PDFMONKEY",cat:"Expense",sub:"Software",st:"Tools",ign:false,biz:true,one:false},
  {mv:"PADDLE",cat:"Expense",sub:"Software",st:"AI",ign:false,biz:true,one:false},
  // Utilities
  {mv:"Tmobile",cat:"Expense",sub:"Utilities",st:"Phone",ign:false,biz:true,one:false},
  {mv:"TMOBILE",cat:"Expense",sub:"Utilities",st:"Phone",ign:false,biz:true,one:false},
  {mv:"T-Mobile",cat:"Expense",sub:"Utilities",st:"Phone",ign:false,biz:true,one:false},
  {mv:"Duke Energy",cat:"Expense",sub:"Utilities",st:"Electric",ign:false,biz:true,one:false},
  {mv:"DUKEENERGY",cat:"Expense",sub:"Utilities",st:"Electric",ign:false,biz:true,one:false},
  {mv:"City of Burlington",cat:"Expense",sub:"Utilities",st:"Water",ign:false,biz:true,one:false},
  {mv:"CITY OF BURLINGTON",cat:"Expense",sub:"Utilities",st:"Water",ign:false,biz:true,one:false},
  // Ads
  {mv:"Google Ads",cat:"Expense",sub:"Ads",st:"Google",ign:false,biz:true,one:false},
  {mv:"Bing",cat:"Expense",sub:"Ads",st:"Bing/Yahoo",ign:false,biz:true,one:false},
  {mv:"RUMBLE",cat:"Expense",sub:"Ads",st:"Video",ign:false,biz:true,one:false},
  {mv:"Ad Management",cat:"Expense",sub:"Ads",st:"Management",ign:false,biz:true,one:false},
  // Rent
  {mv:"TRAILHEAD CHURCH",cat:"Expense",sub:"Rent",st:"Office",ign:false,biz:true,one:false},
  {mv:"Trailhead Church",cat:"Expense",sub:"Rent",st:"Office",ign:false,biz:true,one:false},
  // Financing
  {mv:"Affirm",cat:"Financing",sub:"Loan",st:"Affirm",ign:true,biz:false,one:false},
  {mv:"AFFIRM",cat:"Financing",sub:"Loan",st:"Affirm",ign:true,biz:false,one:false},
  {mv:"Working Capital",cat:"Financing",sub:"Loan",st:"PayPal WC",ign:true,biz:false,one:false},
  // Revenue
  {mv:"Website Payment",cat:"Revenue",sub:"Sales",st:"Website",ign:false,biz:true,one:false},
  {mv:"Subscription Payment",cat:"Revenue",sub:"Recurring",st:"Subscription",ign:false,biz:true,one:false},
  {mv:"Mass Pay",cat:"Revenue",sub:"Content",st:"YouTube",ign:false,biz:true,one:false},
  {mv:"Course Member",cat:"Revenue",sub:"Sales",st:"Course",ign:false,biz:true,one:false},
  {mv:"Freedom Income Engine",cat:"Revenue",sub:"Recurring",st:"Subscription",ign:false,biz:true,one:false},
  {mv:"Roadmap Implementation",cat:"Revenue",sub:"Recurring",st:"Subscription",ign:false,biz:true,one:false},
  {mv:"Freedom Execution Alerts",cat:"Revenue",sub:"Recurring",st:"Subscription",ign:false,biz:true,one:false},
  {mv:"Learn To Trade",cat:"Revenue",sub:"Sales",st:"Course",ign:false,biz:true,one:false},
  {mv:"Wire Transfer Incoming",cat:"Revenue",sub:"Sales",st:"Wire",ign:false,biz:true,one:false},
  {mv:"Subscription creation",cat:"Revenue",sub:"Recurring",st:"Subscription",ign:false,biz:true,one:false},
  {mv:"Subscription update",cat:"Revenue",sub:"Recurring",st:"Subscription",ign:false,biz:true,one:false},
  // Fees
  {mv:"Stripe processing fee",cat:"Fees",sub:"Processing",st:"Stripe",ign:false,biz:true,one:false},
  {mv:"Stripe Processing Fee",cat:"Fees",sub:"Processing",st:"Stripe",ign:false,biz:true,one:false},
  {mv:"Payment Fee",cat:"Fees",sub:"Processing",st:"PayPal",ign:false,biz:true,one:false},
  {mv:"Merchant Fee",cat:"Fees",sub:"Processing",st:"PayPal",ign:false,biz:true,one:false},
  // Transfers
  {mv:"ATM Cash Withdrawal",cat:"Transfer",sub:"Owner Draw",st:"ATM",ign:true,biz:false,one:false},
  {mv:"ATM Withdrawal",cat:"Transfer",sub:"Owner Draw",st:"ATM",ign:true,biz:false,one:false},
  {mv:"STRIPE TRANSFER",cat:"Transfer",sub:"Settlement",st:"Stripe Payout",ign:true,biz:false,one:false},
  {mv:"Stripe Payout",cat:"Transfer",sub:"Settlement",st:"Stripe Payout",ign:true,biz:false,one:false},
  {mv:"PAYPAL TRANSFER",cat:"Transfer",sub:"Settlement",st:"PayPal Payout",ign:true,biz:false,one:false},
  {mv:"American Express TRANSFER",cat:"Transfer",sub:"Internal",st:"Account Transfer",ign:true,biz:false,one:false},
  {mv:"SCHWAB BROKERAGE",cat:"Transfer",sub:"Investment",st:"Schwab",ign:true,biz:false,one:false},
  {mv:"CHASE CREDIT CRD",cat:"Transfer",sub:"CC Payment",st:"Chase",ign:true,biz:false,one:false},
  {mv:"DISCOVER E-PAYMENT",cat:"Transfer",sub:"CC Payment",st:"Discover",ign:true,biz:false,one:false},
  {mv:"AMEX EPAYMENT",cat:"Transfer",sub:"CC Payment",st:"Amex",ign:true,biz:false,one:false},
  {mv:"User Initiated Withdrawal",cat:"Transfer",sub:"Settlement",st:"PayPal Withdrawal",ign:true,biz:false,one:false},
  {mv:"General Card Withdrawal",cat:"Transfer",sub:"Settlement",st:"PayPal Card",ign:true,biz:false,one:false},
  {mv:"Debit Card Cash Back",cat:"Transfer",sub:"Cashback",st:"PayPal",ign:true,biz:false,one:false},
  {mv:"Reversal of General Account",cat:"Transfer",sub:"Hold Reversal",st:"PayPal",ign:true,biz:false,one:false},
  {mv:"Account Hold for Open",cat:"Transfer",sub:"Hold",st:"PayPal",ign:true,biz:false,one:false},
  // Personal
  {mv:"FOOD LION",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"DOLLAR GENERAL",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"DOLLAR-GENERAL",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"FAMILY DOLLAR",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"WAL-MART",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"WALMART",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"INGLES",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"HARRIS TEETER",cat:"Personal",sub:"Groceries",st:null,ign:true,biz:false,one:false},
  {mv:"MURPHY",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
  {mv:"MCDONALD",cat:"Personal",sub:"Food",st:null,ign:true,biz:false,one:false},
  {mv:"DOMINO",cat:"Personal",sub:"Food",st:null,ign:true,biz:false,one:false},
  {mv:"BURGER KING",cat:"Personal",sub:"Food",st:null,ign:true,biz:false,one:false},
  {mv:"TACO BELL",cat:"Personal",sub:"Food",st:null,ign:true,biz:false,one:false},
  {mv:"DAIRY QUEEN",cat:"Personal",sub:"Food",st:null,ign:true,biz:false,one:false},
  {mv:"ZACKS HOT DOGS",cat:"Personal",sub:"Food",st:null,ign:true,biz:false,one:false},
  {mv:"K&J GRILL",cat:"Personal",sub:"Food",st:null,ign:true,biz:false,one:false},
  {mv:"SHEETZ",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
  {mv:"KWIK 5 POINTS",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
  {mv:"KWIK 5 POI",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
  {mv:"CITGO",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
  {mv:"ALAMANCE C",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
  {mv:"SPEEDWAY",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
  {mv:"GREAT CLIPS",cat:"Personal",sub:"Personal Care",st:null,ign:true,biz:false,one:false},
  {mv:"CVS/PHARMACY",cat:"Personal",sub:"Health",st:null,ign:true,biz:false,one:false},
  {mv:"LOWE'S",cat:"Personal",sub:"Home",st:null,ign:true,biz:false,one:false},
  {mv:"HOME DEPOT",cat:"Personal",sub:"Home",st:null,ign:true,biz:false,one:false},
  {mv:"AMAZON",cat:"Personal",sub:"Shopping",st:null,ign:true,biz:false,one:false},
  {mv:"PRIME VIDEO",cat:"Personal",sub:"Entertainment",st:null,ign:true,biz:false,one:false},
  {mv:"AMAZON PRIME",cat:"Personal",sub:"Entertainment",st:null,ign:true,biz:false,one:false},
  {mv:"NC ZOO",cat:"Personal",sub:"Entertainment",st:null,ign:true,biz:false,one:false},
  {mv:"GOODWILL",cat:"Personal",sub:"Shopping",st:null,ign:true,biz:false,one:false},
  {mv:"FULLSCRIPT",cat:"Personal",sub:"Health",st:null,ign:true,biz:false,one:false},
  {mv:"APEX HOSTI",cat:"Personal",sub:"Gaming",st:null,ign:true,biz:false,one:false},
  {mv:"APEX MINEC",cat:"Personal",sub:"Gaming",st:null,ign:true,biz:false,one:false},
  {mv:"USPS",cat:"Personal",sub:"Shipping",st:null,ign:true,biz:false,one:false},
  {mv:"YMCA",cat:"Personal",sub:"Gym",st:null,ign:true,biz:false,one:false},
  {mv:"ROKU",cat:"Personal",sub:"Entertainment",st:null,ign:true,biz:false,one:false},
  {mv:"PNC BANK",cat:"Transfer",sub:"ATM",st:"PNC",ign:true,biz:false,one:false},
  {mv:"LOVE'S",cat:"Personal",sub:"Gas",st:null,ign:true,biz:false,one:false},
];

export async function seedDefaultRules(): Promise<number> {
  // Delete all existing non-manual rules and re-seed
  await prisma.categorizationRule.deleteMany({});

  const data = DEFAULT_RULES.map((r, i) => ({
    priority: r.ign ? 5 : (r.cat === "Revenue" ? 10 : 50),
    sourceSystem: null,
    matchField: "description",
    matchType: "contains",
    matchValue: r.mv,
    category: r.cat,
    subcategory: r.sub,
    subtype: r.st,
    txType: null,
    isIgnored: r.ign,
    isOneTime: r.one,
    isBusinessRelevant: r.biz,
    active: true,
  }));

  await prisma.categorizationRule.createMany({ data: data as any[] });
  return data.length;
}
