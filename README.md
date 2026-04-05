# MoneyMachine 💰

Financial command center for Freedom Income Options. Automatically syncs revenue and expenses from Stripe, PayPal, and bank accounts (via Plaid) into a single dashboard with TTM metrics, P&L, cash position, categorization engine, and trend analysis.

## Architecture

```
Stripe API ──────┐
PayPal API ──────┤──→ Sync Engine ──→ PostgreSQL ──→ Categorization ──→ Report API ──→ Dashboard
Plaid API ───────┘    (cron + manual)   (Prisma)      Rules Engine       (Next.js)     (React)
```

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Hosting:** Railway
- **Data Sources:** Stripe, PayPal, Plaid (pending)
- **UI:** React + Tailwind CSS + Inter font
- **Brand:** FIO colors — Navy #0B1120, Green #10B981, Blue #2563EB

## Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Main financial dashboard — TTM, P&L, trends, transactions |
| `/review` | Transaction review — classify, edit, create rules |
| `/connect` | Connect bank accounts via Plaid Link |
| `/upload` | Manual CSV transaction upload |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sync/stripe` | POST | Sync Stripe charges, fees, refunds (paginated) |
| `/api/sync/paypal` | POST | Sync PayPal transactions (31-day chunked windows) |
| `/api/sync/plaid` | POST | Sync Plaid bank transactions + balances |
| `/api/sync/all` | POST | Sync all sources at once |
| `/api/cron/daily-sync` | POST | Cron endpoint (protected by CRON_SECRET) |
| `/api/categorize` | POST | Run categorization engine (seed rules, classify txns) |
| `/api/transactions` | GET/PATCH | List and update transactions |
| `/api/rules` | GET/POST/DELETE | Manage categorization rules |
| `/api/report/v2/[monthkey]` | GET | Full monthly report with TTM, cash position |
| `/api/plaid/create-link-token` | POST | Create Plaid Link token |
| `/api/plaid/exchange-token` | POST | Exchange Plaid public token |
| `/api/upload-transactions` | POST | Upload CSV transactions |

## Categorization Engine

Rules-based system that auto-classifies transactions. 70+ pre-built rules covering:

- **Revenue:** Website Payment → Sales, Subscription Payment → Recurring, Mass Pay → YouTube
- **Software:** WPEngine, OpenAI, Anthropic, Canva, Postmark, Railway, Zendesk, etc.
- **Ignored:** PayPal Working Capital (financing), ATM withdrawals (owner draw), internal transfers, CC payments
- **Personal:** Food Lion, Dollar General, Walmart, McDonald's, etc. (excluded from P&L)
- **Utilities:** T-Mobile, Duke Energy, City of Burlington
- **Rent:** Trailhead Church

Rules support exact match, contains, and regex. Priority-ordered. Manual overrides preserved. One-click rule creation from corrections.

## Setup

### 1. Install dependencies
```bash
cd dashboard && npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in: DATABASE_URL, STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET,
#          PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, CRON_SECRET
```

### 3. Push database schema
```bash
npx prisma db push --accept-data-loss
```

### 4. Seed historical data
```bash
npm run seed
```

### 5. Deploy & sync
```bash
npm run dev
# Visit /dashboard → click "Sync All"
# Visit /review → click "Auto-Categorize"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| STRIPE_SECRET_KEY | Stripe secret key |
| PAYPAL_CLIENT_ID | PayPal app client ID |
| PAYPAL_CLIENT_SECRET | PayPal app secret |
| PLAID_CLIENT_ID | Plaid client ID |
| PLAID_SECRET | Plaid secret |
| PLAID_ENV | sandbox / development / production |
| CRON_SECRET | Secret for protecting the cron endpoint |

## Dashboard Metrics

- **TTM Revenue** — Trailing 12-month total revenue
- **TTM Profit** — Trailing 12-month net profit with margin
- **Cash Position** — Live balances from connected bank accounts (Plaid)
- **MoM Growth** — Month-over-month revenue growth rate
- **Monthly P&L** — Gross revenue, refunds, fees, net revenue, operating expenses, one-time expenses, net profit, margin
- **Revenue by Source** — Breakdown with visual bars (Stripe, PayPal, YouTube, Substack)
- **Revenue by Subtype** — Course, Subscription, Website Sales, YouTube
- **Expense Breakdown** — By subcategory (Software, Rent, Utilities, Contractors) with drill-down
- **Monthly Trend** — Clickable bar chart for all historical months
- **Transaction Log** — Filterable by type (Income, Expense, Fee, Refund)
- **Sync Status** — Last sync time per source

## Dev Log

### April 4, 2026 — Initial Build

**What was built:**
- Full MoneyMachine platform from scratch on Next.js 16 + Prisma + PostgreSQL
- Stripe sync engine — pulls charges, balance transaction fees, and refunds with pagination
- PayPal sync engine — pulls transaction history with 31-day chunked windows (PayPal API limit)
- Plaid integration — Link widget for bank account connection, cursor-based transaction sync, balance tracking (awaiting Plaid API access approval)
- Sync-all endpoint + daily cron endpoint with auth
- Database-driven dashboard replacing old hardcoded monthlySummary.ts data
- TTM revenue/profit/margin, MoM growth, cash position cards
- Monthly P&L with gross revenue, refunds, fees, net revenue, expenses, net profit, margin
- Revenue by source with visual bars
- Expense breakdown with click-to-drill-down
- Interactive monthly trend bar chart (click a month to view it)
- Filterable transaction table
- Categorization rules engine with 70+ pre-built rules
- Transaction review page with inline editing and one-click rule creation
- Report API filters ignored items from P&L, separates operating vs one-time expenses
- Seeded 12 months historical data (Mar 2025 – Feb 2026) from old monthlySummary.ts
- Seeded March 2026 from uploaded Stripe CSV, PayPal statement, and Amex bank statements
- FIO brand applied — navy/green/blue color scheme, Inter font
- Deployed to Railway with auto-deploy from GitHub

**What's working:**
- Stripe sync ✅ (pulling real transaction-level data)
- PayPal sync ✅ (fixed 31-day window issue, now pulling real data)
- Dashboard ✅ (live at Railway URL)
- Categorization engine ✅ (rules seeded, auto-classify working)
- Transaction review UI ✅
- Historical data seeded ✅

**What's pending:**
- Plaid bank account connection (awaiting API approval)
- Monthly auto-report generation + email summary
- Enhanced dashboard sections (revenue by subtype, ignored items list, review queue)
- Bulk transaction classification actions
- Duplicate/transfer detection (matching Stripe payouts to bank deposits)
- CSV/PDF monthly report export
- Trend charts (Recharts integration)

**Known issues:**
- Stripe API version must match SDK (`2026-02-25.clover`) — was causing build failures
- PayPal API requires ≤31-day windows — was causing 400 errors before chunking fix
- `prisma db push` requires `--accept-data-loss` flag for schema changes with unique constraints
- Old monthlySummary.ts seed data is summary-level (one row per source per month), not transaction-level
