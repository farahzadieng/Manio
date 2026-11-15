# مانیو — دفتر خرج شخصی

Persian RTL, local-first expense journal built with React, TypeScript, Vite, IndexedDB, Tailwind CSS, Zod and a PWA service worker.

## Run

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Tests: `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e` (install Playwright browser first with `npx playwright install chromium`).

## Data and privacy

Transactions, categories, sources, obligations and settings live only in this browser origin's IndexedDB. There is no account, sync, balance tracking, backend or financial upload. Each device and browser origin has independent data. Browser or OS cleanup can remove it; export JSON regularly. A new Cloudflare hostname has separate storage, so export/import when changing domains. Hosted app code is public to visitors; one visitor's local data is not served to another. The app requests no persistent notification service. Reminders appear when opened or resumed.

Amounts are positive safe integer tomans (at most 9,007,199,254,740,991 each). Sums fail if they exceed safe integer precision. Dates are stored as local civil Gregorian `YYYY-MM-DD` and shown in Jalali. Archived categories and sources remain referenced by historic transactions, which also retain the label present when recorded. Backup JSON preserves integer values and uses schema and reference validation before a single IndexedDB write transaction. Merge keeps existing local records when IDs collide and adds new records; replace swaps all stores in one transaction.

## Architecture

`src/lib/domain.ts` contains validation and date/report/search logic. `src/lib/db.ts` owns IndexedDB stores and migration. `src/lib/backup.ts` handles JSON and CSV. `src/components/DatePicker.tsx` isolates the Jalali picker. `src/App.tsx` contains the mobile screens. The bundled Arad variable font and user-provided app icon are served locally from the app assets; no runtime CDN assets are required. The full-resolution icon source is in `design/app-icon-user-cropped.png`.

See `docs/DEPLOYMENT.md` and `docs/QA_REPORT.md`.
