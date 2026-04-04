# MoneyMachine 💰

Financial command center for Freedom Income Options. Automatically syncs revenue and expenses from Stripe, PayPal, and bank accounts (via Plaid) into a single dashboard with TTM metrics, P&L, cash position, and trend analysis.

## Architecture

```
Stripe API ──────┐
PayPal API ──────┤──→ Sync Engine ──→ PostgreSQL ──→ Report API ──→ Dashboard
Plaid API ───────┘    (cron + manual)   (Prisma)      (Next.js)     (React)
```

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Hosting:** Railway
- **Data Sources:** Stripe, PayPal, Plaid
- **UI:** React + Tailwind CSS + Inter font

## Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Main financial dashboard (DB-driven) |
| `/connect` | Connect bank accounts via Plaid Link |
| `/upload` | Manual CSV transaction upload |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sync/stripe` | POST | Sync Stripe charges, fees, refunds |
| `/api/sync/paypal` | POST | Sync PayPal transaction history |
| `/api/sync/plaid` | POST | Sync Plaid bank transactions + balances |
| `/api/sync/all` | POST | Sync all sources at once |
| `/api/cron/daily-sync` | POST | Cron endpoint (protected by CRON_SECRET) |
| `/api/report/v2/[monthkey]` | GET | Full monthly report with TTM, cash position |
| `/api/plaid/create-link-token` | POST | Create Plaid Link token |
| `/api/plaid/exchange-token` | POST | Exchange Plaid public token |
| `/api/upload-transactions` | POST | Upload CSV transactions |

## Setup

### 1. Install dependencies
```bash
cd dashboard
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your actual keys
```

### 3. Push database schema
```bash
npx prisma db push
```

### 4. Seed historical data
```bash
npm run seed
```

### 5. Run locally
```bash
npm run dev
```

### 6. Connect bank accounts
Visit `/connect` to link your bank through Plaid.

### 7. Sync data
Click "Sync All" on the dashboard, or:
```bash
npm run sync
```

## Daily Cron Setup

Set up a cron job to POST to `/api/cron/daily-sync` daily:
```bash
curl -X POST https://your-app.railway.app/api/cron/daily-sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
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
- **Cash Position** — Live balances from connected bank accounts
- **MoM Growth** — Month-over-month revenue growth rate
- **Monthly P&L** — Gross revenue, refunds, fees, net revenue, expenses, net profit, margin
- **Revenue by Source** — Breakdown with visual bars
- **Expense Breakdown** — Categorized with drill-down to line items
- **Monthly Trend** — Clickable bar chart for all historical months
- **Transaction Log** — Filterable by type (Income, Expense, Fee, Refund)
