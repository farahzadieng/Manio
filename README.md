# Manio

Manio is a Persian, right-to-left personal expense journal. It helps you record what you spent, understand where the money went, and remember upcoming payments. It is intentionally a journal: there are no account balances, bank connections, login, or cloud sync.

## Use the hosted app

Open [manio.luminiastudio.ir](https://manio.luminiastudio.ir) on your phone or computer. Choose an empty journal or try the demo on first launch. On iPhone, use Safari's **Share → Add to Home Screen** to install it as a PWA. Once the app has loaded and its assets have been cached, it can reopen offline.

Add expenses and income from the home screen. Pick a category, date, and optional payment source; amounts are stored as integer Iranian tomans. New expenses preselect the source used by the most recently recorded transaction that still has an active source; you can change it. Star a transaction while creating or editing it to place a reusable shortcut on Home. Selecting that shortcut starts a **new** transaction with the same amount, category, source, necessity, and note, dated today. Reports use Jalali periods and local filters. Obligations track debts, receivables, planned payments, and reminders separately from transactions.

Everything you enter stays in this browser's IndexedDB. Each device and each site hostname has separate data. The browser or operating system may erase local storage, so export a JSON backup from Settings regularly. A small reminder appears once per Gregorian month when the app is open, unless you already backed up that month. Import a backup on another device or hostname. CSV export is available for transactions. Manio does not upload financial data, and reminders only appear while the app is open or resumed.

## Host your own copy on Cloudflare Pages

1. Fork [the Manio repository](https://github.com/farahzadieng/Manio) on GitHub.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Workers & Pages → Create application → Pages → Import an existing Git repository**. Connect GitHub and select your fork.
3. Set the production branch to `main`, build command to `npm run build`, and build output directory to `dist`. Leave the root directory at the repository root. Deploy. No backend, database, or client environment variables are required.
4. Open the resulting `*.pages.dev` address. You can attach a custom domain in the Pages project settings. Keep the hostname stable: a different hostname has a different IndexedDB store. Export and import JSON before moving.

Cloudflare Pages rebuilds when new commits reach the connected production branch. There is no catch-all `_redirects` file; Pages provides SPA fallback for this static build. The installed PWA checks for updates and offers a reload when a new version is ready. Confirm the deployment in Cloudflare before expecting a phone to update.

## Develop locally

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run e2e
npm run e2e:offline
npm run preview
```

The stack is React, TypeScript, Vite, native IndexedDB, Zod, and Workbox. The app and bundled font/icons have no runtime CDN dependency. See [Architecture.md](Architecture.md) for the code map, [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for release details, and [docs/QA_REPORT.md](docs/QA_REPORT.md) for test scope and iPhone checks. The app version is 1.5 (`package.json` uses SemVer `1.5.0`).
