# DEV_LOG — MoneyMachine

## Current state
**Status:** Live
**Version:** v2.0
**Railway service:** Business Dashboard (moneymachine-production)
**URL:** https://cashflow.freedomincomeoptions.com
**Last deployed:** 2026-04-08
**Last agent session:** 2026-04-08

## Stack
- **Backend:** Next.js 16.1.1 (App Router, TypeScript)
- **Frontend:** React 19 + Tailwind CSS 4
- **Database:** PostgreSQL 15 — Railway managed (Prisma 5.22 ORM)
- **Email:** None yet (Postmark planned for monthly reports)
- **Auth:** None (single-user internal tool, no public access)
- **Key dependencies:** stripe@20, papaparse@5, prisma@5.22, tsx@4

## Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway internal) |
| `STRIPE_SECRET_KEY` | Stripe API — pulls charges, fees, refunds |
| `PAYPAL_CLIENT_ID` | PayPal API — OAuth client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal API — OAuth secret |
| `PLAID_CLIENT_ID` | Plaid API — bank account connections |
| `PLAID_SECRET` | Plaid API — production secret |
| `PLAID_ENV` | Plaid environment: `production` |
| `CRON_SECRET` | Protects `/api/cron/daily-sync` endpoint |

## Architecture notes
MoneyMachine is a financial command center for Freedom Income Options. It automatically syncs revenue from Stripe and PayPal, expenses from connected bank accounts (via Plaid), and categorizes everything using a 156-rule rules engine derived from Casey's cashflow spreadsheet. The dashboard shows TTM revenue, monthly P&L, cash position, revenue by source/subtype, and expense breakdowns — all computed from the database in real time. Historical data (Mar 2025–Feb 2026) was seeded from a static TypeScript file; going forward, all data comes from API syncs. The Prisma schema includes Transaction, CategorizationRule, PlaidItem, PlaidAccount, SyncLog, and MonthlyReport models. The report API filters out ignored transactions (personal spending, transfers, loan repayments) from P&L calculations and separates operating from one-time expenses.

## What's working
- Stripe sync — pulls real transaction-level charges, fees, and refunds with pagination
- PayPal sync — pulls transaction history with 31-day chunked windows (PayPal API limit)
- Plaid bank connection — First Horizon linked, Bank of America and Chase enabled and ready to connect
- Dashboard at `/dashboard` — TTM revenue ($132K+), monthly P&L, revenue by source, expense breakdown, trend chart, transaction table
- Transaction review at `/review` — filter by month/type/categorized status, inline editing, one-click rule creation
- Categorization engine — 156 rules from Casey's spreadsheet covering software, contractors, rent, utilities, ads, personal spending, transfers, financing
- Auto-categorize button seeds rules and classifies all transactions
- Sync All button triggers all three sources (Stripe, PayPal, Plaid)
- Daily cron endpoint at `/api/cron/daily-sync` (auth-protected)
- CSV upload at `/upload` for manual transaction import
- Historical data seeded for 12 months (Mar 2025–Feb 2026)
- March 2026 data seeded from uploaded Stripe CSV, PayPal statement, and Amex bank statements
- Plaid account balances showing on dashboard (Cash Position card)

## Pending / next up
- Connect Bank of America and Chase via Plaid (already enabled in OAuth)
- American Express Plaid access — application URL added, waiting for approval (~1 week)
- Auto-categorize on every sync run (currently manual button click)
- Monthly auto-report generation + email summary via Postmark
- Enhanced dashboard: revenue by subtype section, ignored items list, review queue widget
- Bulk transaction classification on `/review` page
- Duplicate/transfer detection (match Stripe payouts to bank deposits)
- Recharts integration for proper trend charts
- CSV/PDF monthly report export
- Daily cron setup on Railway (scheduled service)
- Clean up seed data — old summary-level entries may double-count with real API data

## Known issues and gotchas
- **Stripe API version must match SDK** — currently `2026-02-25.clover`. If Stripe SDK updates, the version string in `app/api/sync/stripe/route.ts` must be updated or the build fails with a TypeScript error
- **PayPal API requires ≤31-day windows** — the sync chunks 90 days into 30-day segments. Without this, PayPal returns 400 INVALID_REQUEST
- **`prisma db push` requires `--accept-data-loss`** — the `prestart` script includes this flag because making `externalId` unique on Transaction triggered a data loss warning
- **Old seed data is summary-level** — months Mar 2025–Feb 2026 have ~5-10 rows each (one per source per month), not individual transactions. Real API data from Stripe/PayPal is transaction-level. This means historical months show less granular expense breakdowns
- **PayPal debit card transactions** appear as expenses in PayPal but many are personal (groceries, gas, food). The categorization engine marks these as ignored/personal, but new vendors may slip through uncategorized
- **Plaid OAuth registration** — American Express, PNC, and several others require institution-specific approval. Bank of America and Chase are already enabled. First Horizon works without OAuth
- **No auth on the dashboard** — this is a single-user internal tool. If the URL becomes public, anyone can see financial data. Consider adding basic auth or IP restriction

## External dependencies
- **Stripe API** — revenue sync. Credential: `STRIPE_SECRET_KEY`
- **PayPal Reporting API** — transaction sync. Credentials: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- **Plaid API** — bank account connections and transaction sync. Credentials: `PLAID_CLIENT_ID`, `PLAID_SECRET`
- **Railway** — hosting (Next.js app + PostgreSQL)
- **GitHub** — repo at `caseystubbs/MoneyMachine` (private). Auto-deploys to Railway on push to main

---

## Journal

### 2026-04-08 — Plaid bank connection + categorization rules from spreadsheet

**Agent session:** yes
**Files changed:** lib/categorization.ts, env vars on Railway (PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV)
**What happened:**
Added Plaid production API keys to Railway environment. Configured Data Transparency Messaging in Plaid dashboard (required for production Link). Connected First Horizon Bank successfully — one checking account with $85.77 balance showing in database. Attempted American Express but got "institution registration required" error. Found that Amex needs Application URL in Plaid OAuth settings — updated it. Bank of America and Chase are already enabled in Plaid OAuth and ready to connect. Also uploaded Casey's cashflow spreadsheet (Cashflow_Freedom_income_options.xlsx) and extracted all vendor-to-category mappings to build 156 categorization rules covering: 15 contractor vendors, 55+ software tools, 7 utilities, 5 ad platforms, rent, 3 financing/loan types, 11 revenue subtypes, 4 fee types, 15 transfer/settlement types, and 40+ personal spending categories. Replaced the old 70-rule `seedDefaultRules()` function with the comprehensive 156-rule version.

**Outcome:** Partial — First Horizon connected, Amex pending OAuth approval, rules upgraded
**Next session should:** Connect Bank of America and Chase accounts, run auto-categorize with new rules, verify P&L accuracy against spreadsheet numbers

### 2026-04-04 — Categorization engine + transaction review UI

**Agent session:** yes
**Files changed:** prisma/schema.prisma, lib/categorization.ts, app/api/categorize/route.ts, app/api/transactions/route.ts, app/api/rules/route.ts, app/review/page.tsx, app/api/report/v2/[monthkey]/route.ts, app/dashboard/page.tsx
**What happened:**
Built three-phase upgrade: (1) Categorization rules engine with CategorizationRule model, priority-based matching (exact/contains/regex), source filtering, and ignore/one-time/business-relevant flags. Pre-loaded 70 rules from known vendors. (2) Transaction review UI at `/review` with month selector, filter buttons (All/Uncategorized/Ignored/Business), inline editing for subcategory/subtype/ignored flags, and one-click rule creation from corrections. Added CRUD API for rules management. (3) Enhanced report API — now filters ignored transactions from P&L, separates operating vs one-time expenses, tracks revenue by subtype, and includes new KPIs (operatingExpenses, oneTimeExpenses, ignoredTotal, netProfitBeforeOneTime). Added subcategory, subtype, isIgnored, isOneTime, isBusinessRelevant, ruleIdApplied, and manualOverride fields to Transaction model. Added MonthlyReport model for future stored reports.

**Outcome:** Success — all three phases deployed and working
**Next session should:** Import categorization rules from Casey's spreadsheet, connect Plaid bank accounts

### 2026-04-04 — PayPal sync fix (31-day window chunking)

**Agent session:** yes
**Files changed:** app/api/sync/paypal/route.ts
**What happened:**
PayPal sync was failing with 400 INVALID_REQUEST because the PayPal Reporting API only allows 31-day date ranges per request. Our sync was requesting 90 days. Fixed by chunking the 90-day range into 30-day windows and looping through each chunk sequentially. After fix, PayPal sync successfully pulled real transaction-level data.

**Outcome:** Success — PayPal sync working in production
**Next session should:** Verify PayPal transaction data quality and completeness

### 2026-04-04 — March 2026 data seed from uploaded statements

**Agent session:** yes
**Files changed:** prisma/seed-march-2026.ts
**What happened:**
Casey uploaded four March 2026 statements: Stripe balance summary CSV, PayPal statement PDF (20 pages of transactions), Amex Business Checking (*3813) statement, and Amex Rewards Checking (*0045) statement. Parsed all documents, extracted revenue ($4,767 Stripe + $5,646 PayPal + $1,675 Amex = ~$12K), fees ($293 Stripe + $238 PayPal), expenses (software, rent, utilities, working capital), and personal spending. Created seed script with individual transactions. Had to run from Codespace with external DATABASE_URL since Railway's internal URL isn't accessible externally. Prisma client needed regeneration after schema changes before seed would work.

**Outcome:** Success — 95+ March 2026 transactions seeded
**Next session should:** Verify dashboard P&L matches statement totals

### 2026-04-04 — Initial MoneyMachine build + deployment

**Agent session:** yes
**Files changed:** Everything — full project built from existing Next.js scaffold
**What happened:**
Built the complete MoneyMachine financial command center from Casey's existing repo (which had a basic Next.js dashboard with hardcoded data and live Stripe/PayPal API calls on the home page). Major changes: (1) Expanded Prisma schema with PlaidItem, PlaidAccount, SyncLog models. Added PLAID/YOUTUBE/SUBSTACK to SourceAccount enum. Made externalId unique for upsert deduplication. (2) Built sync engine — Stripe sync (charges, balance transaction fees, refunds with pagination), PayPal sync (transaction history), Plaid sync (cursor-based transaction sync + balance updates), sync-all orchestrator, and daily cron endpoint with auth. (3) Built Plaid Link integration — token creation, token exchange, account storage, and `/connect` UI page. (4) Built new DB-driven dashboard replacing hardcoded monthlySummary.ts — TTM metrics, monthly P&L, MoM growth, cash position, revenue by source with visual bars, expense breakdown with drill-down, interactive monthly trend bar chart, filterable transaction table, sync status. (5) FIO branding — navy/green/blue color scheme, Inter font, updated metadata. (6) Seeded 12 months of historical data from old monthlySummary.ts into the Transaction table. (7) Created comprehensive README and .env.example. Multiple deployment issues resolved: package-lock.json out of sync (tsx dependency), Stripe API version mismatch (2025-12-15 vs 2026-02-25), prisma db push requiring --accept-data-loss flag for unique constraint migration.

**Outcome:** Success — full platform deployed and live on Railway
**Next session should:** Seed March 2026 data from uploaded statements, fix PayPal 31-day window issue
