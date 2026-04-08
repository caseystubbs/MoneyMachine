# Changelog — MoneyMachine

## 2026-04-08
### [feature] Plaid bank account connection live
Connected First Horizon Bank via Plaid production API. Checking account balance ($85.77) syncing to dashboard Cash Position card. Bank of America and Chase already enabled in Plaid OAuth — ready to connect. American Express pending institution registration (application URL submitted, ~1 week for approval).

### [feature] 156 categorization rules imported from cashflow spreadsheet
Parsed Casey's Cashflow_Freedom_income_options.xlsx and extracted all vendor-to-category mappings. Rules cover: 55+ software tools, 15 contractor vendors, 7 utilities, 5 ad platforms, rent, 3 financing/loan types, 11 revenue subtypes, 4 fee types, 15 transfer/settlement types, and 40+ personal spending categories (groceries, gas, food — all marked as ignored from P&L). Auto-Categorize on `/review` now seeds all 156 rules and classifies transactions in bulk.

### [docs] DEV_LOG.md added to repo
Full developer log with current state, stack, architecture notes, environment variables, what's working, pending items, known issues, external dependencies, and session journal with four detailed entries.

## 2026-04-04
### [feature] Categorization rules engine + transaction review UI
Built three-phase upgrade: (1) CategorizationRule model with priority-based matching (exact/contains/regex), source filtering, ignore/one-time/business-relevant flags. (2) Transaction review page at `/review` with month selector, filter buttons, inline editing, and one-click rule creation from corrections. (3) Report API now filters ignored transactions from P&L, separates operating vs one-time expenses, tracks revenue by subtype.

### [fix] PayPal sync — 31-day window chunking
PayPal Reporting API only allows 31-day date ranges per request. Sync was requesting 90 days and getting 400 errors. Fixed by chunking into 30-day windows. PayPal now syncing real transaction-level data successfully.

### [feature] March 2026 data seeded from uploaded statements
Parsed four March 2026 statements (Stripe CSV, PayPal PDF, Amex Business Checking, Amex Rewards Checking). Extracted revenue ($4,767 Stripe + $5,646 PayPal + $1,675 Amex), fees, expenses, and personal spending. 95+ individual transactions inserted into database.

### [deploy] Full MoneyMachine v2 platform built and deployed
Complete rebuild of MoneyMachine from basic Next.js scaffold to full financial command center. Stripe sync (charges, fees, refunds with pagination), PayPal sync (transaction history), Plaid integration (Link widget, cursor-based sync, balance tracking), database-driven dashboard with TTM metrics, monthly P&L, MoM growth, cash position, revenue by source, expense drill-down, interactive trend chart, filterable transactions. FIO branding applied. 12 months historical data seeded. Deployed to Railway with auto-deploy from GitHub.

### [fix] Stripe API version mismatch
Build was failing because Stripe SDK expected `2026-02-25.clover` but code had `2025-12-15.clover`. Updated to match installed SDK version.

### [fix] package-lock.json out of sync
Railway `npm ci` was failing because tsx dependency was added to package.json but not in lock file. Regenerated lock file with `npm install tsx@4 --save-dev`.

### [fix] Prisma schema migration — accept data loss
Making `externalId` unique on Transaction table required `--accept-data-loss` flag for `prisma db push`. Updated prestart script to include the flag.

## 2026-04-05
### [deploy] MoneyMachine cashflow tools deployed to Railway
Internal accounting and cashflow tracking system live for Freedom Income Options.

### [feature] Revenue tracking connected to MemberPress
MemberPress subscription revenue syncs automatically for real-time cashflow visibility.
