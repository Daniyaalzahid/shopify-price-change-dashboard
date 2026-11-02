# Price Desk — Shopify Price Change Dashboard

Phase 2 adds MySQL-backed accounts, sessions and team management to the pricing UI. **The catalog remains sample data. Shopify is not connected and live publishing is disabled.**

## Local setup

Use Node.js 22 or 24 and MySQL 8.0+ (CI uses 8.4).

```sh
npm ci
```

For a public sample UI only, set `APP_MODE=demo`. Account APIs are disabled in this explicit mode. Without this flag the app requires authentication; missing or broken configuration never silently enables a demo account.

For authenticated use, copy `.env.example` to a protected `.env` file and set the database connection and exact `APP_ORIGIN` (no trailing slash). Use HTTPS except on loopback during local development. For production configure the same variables in Hostinger's app settings. Never commit `.env` or credentials.

Create a dedicated empty MySQL database and a database user authorized for that database, then run:

```sh
npm run db:migrate
npm run db:bootstrap
npm run dev
```

Before bootstrap, provide `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL`, and a unique `BOOTSTRAP_PASSWORD` of 12–128 characters through a protected environment or secret configuration. Do not put secrets in shell command arguments or commit them. Remove the bootstrap variables after the command succeeds. Bootstrap refuses to create a second Super Admin. It never prints passwords. The login page has no public registration.

Migrations use a database advisory lock and checksums. DDL is not transactionally reversible in MySQL; the initial migration uses idempotent table creation so interrupted runs can resume. Do not edit an applied migration. Back up production before database changes.

## Roles and sessions

- Super Admin: create team accounts, activate/deactivate them, reset team passwords and inspect the latest 50 account activity events.
- Team: authenticated access to the sample pricing workspace and own password change. Direct team-management API calls are rejected server-side. Shopify publishing for both roles is still disabled.
- Each account can change its password in Settings. Password changes and administrator resets revoke all of that user's sessions. Deactivation revokes sessions immediately. The Super Admin cannot be deactivated or demoted through the team API.
- Passwords use salted scrypt (N=32768, r=8, p=3). Opaque random session tokens are hashed in MySQL; cookies are HttpOnly, SameSite=Strict, path=/ and Secure with a __Host- prefix on HTTPS.
- Sessions expire after 12 hours or 2 hours of inactivity; at most five sessions per account. Login attempts are limited in MySQL by normalized email and globally. Own-password attempts share the limiter. No untrusted forwarded IP header is used.
- All mutations require the exact configured Origin and reject cross-site requests. JSON bodies are limited to 8 KiB. There is no public account recovery endpoint.
- Super Admin recovery is a server-side CLI operation: securely set `BOOTSTRAP_EMAIL` and `BOOTSTRAP_PASSWORD`, then run `npm run db:recover-admin`. It revokes sessions and records an account event. Remove the temporary secret variables afterward.

## Pricing UI

Combined name/SKU search, brand/collection/status filters, individual price editing, validation, reset, pagination, all-page review and CSV export are included. Compare-at values are read-only. Blank new prices mean no change.

Drafts remain **browser-local**, with storage separated by signed-in account ID. They are not shared or backed up to MySQL. Legacy public demo drafts are not imported into real accounts. The MySQL tables in this phase store users, sessions, login limits and account events only.

Account events are separate from the future verified Shopify price audit log. There are no fabricated successful price updates or admin notifications.

## Checks

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Demo browser tests start a demo-mode development server. For real database checks, set `TEST_DATABASE=true` and point the DB variables at a **dedicated test database**, migrate it, then run:

```sh
npm run test:integration
npm run test:auth-browser
```

The authenticated browser suite starts the production build in auth mode at http://127.0.0.1:3000. It creates temporary test accounts and removes its fixtures. Do not point tests at a live database. GitHub Actions provisions MySQL 8.4 and runs migrations twice, account integration tests and authenticated browser tests, in addition to the demo checks.

## Hostinger deployment

Connect the repository and selected branch as a Next.js Node.js Web App using Node.js 22/24, `npm run build`, and `npm start`. Set the environment variables, use a staging subdomain, provision MySQL, run migrations, and bootstrap the administrator before team use. An app deployment does not run migrations automatically. Use a protected `.env` or explicitly load the app's private environment for CLI/cron tasks; Hostinger cron does not automatically inherit app variables.

Schedule `npm run db:cleanup` to delete expired sessions and expired login-limit rows. On Hostinger cron, use the supported Node executable and protected environment file with `--import tsx scripts/manage.ts cleanup` in the deployed app directory. Account audit records are not removed by cleanup. A backup/retention policy should be configured separately.

Always-running workers are unsupported on the managed Business plan. Future Shopify jobs must persist in MySQL and run in bounded, resumable cron batches. The app does not depend on Redis, Docker or WebSockets.

## Still pending

Shopify authorization, real product/variant synchronization, database-backed price drafts, stale-price conflicts, durable publish jobs, Shopify verification/retries, account-attributed price history and admin notifications. No Shopify credential is needed for this phase. Authentication has not been deployed to the user's Hostinger account by this PR.
