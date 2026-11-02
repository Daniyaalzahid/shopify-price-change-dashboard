# Price Desk — Shopify Price Change Dashboard

Phase 1: an interactive **demo UI**, built for Bismillah Electronics. No Shopify requests are made and no live prices can be changed.

## Run locally

Use Node.js 22 or 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

## Included

- Next.js App Router + TypeScript, Tailwind CSS and shadcn-style Radix UI primitives.
- 16 clearly labelled sample variant rows (not the real store catalog).
- Combined name/SKU search, brand, collection and status filters.
- Direct individual price editing, validation, per-row reset and pagination.
- Browser-local drafts retained across filters, pagination and refresh.
- Review dialog includes all changed variants, including hidden rows; CSV export.
- Read-only compare-at prices. Blank new prices mean no change.
- Responsive layout, keyboard-accessible dialogs and labelled controls.
- Honest empty states for update history, team management, settings and notifications.

## Not implemented yet

Authentication, real roles/accounts, MySQL, server-saved drafts, Shopify authorization/sync, publish jobs, conflict checks, verification/retries, audit history and account-wise admin notifications. The displayed Super Admin is a placeholder. Sync and Update Shopify are intentionally disabled. Local drafts belong to this browser, not to an authenticated user; do not treat this preview as a production admin tool.

## Agreed production scope

One Shopify store, approximately 2,000–2,500 products and some variants. Super Admin manages users and store configuration; team members may independently review and publish individual price changes. The admin must see the initiating account, old/new prices, product/variant, Pakistan timestamp and verified result. Compare-at editing is excluded.

## Hostinger deployment of this preview

Connect this repository using Hostinger's Node.js Web App flow, select Next.js and a supported Node.js 22/24 runtime, and use `npm run build` / `npm start` where prompted. Connect your subdomain after the build succeeds. No API credentials or database are needed for this preview. Use a staging subdomain until authentication and the backend are ready.

For production, persist jobs in MySQL and process bounded batches using cron. Do not depend on in-memory jobs or an always-running worker on managed Business hosting. Database migrations and authenticated deployment/cron configuration will be added with the backend. Never commit secrets.
