# QA report — 2026-11-15

## Automated release checks

- `npm run lint`: passed, 0 warnings.
- `npm run typecheck`: passed.
- `npm test`: passed, 13 unit/integration tests. Covers amount parsing, notes, Jalali boundaries, recurrence month rollover, normalization/search, reports, trend year boundary, local date, CRUD/reset, v1→v2 migration, demo idempotency, backup round trip, invalid import rollback and merge deduplication.
- `npm run e2e`: passed, 5 Chrome mobile emulation tests. Covers empty/demo onboarding, transaction create/edit/repeat/delete, income, combined search, reports, obligation completion with optional transaction, JSON export/import, reset, themes, 320 px overflow and tab visibility.
- `npm run build`: passed; Vite generated `dist/manifest.webmanifest`, `dist/sw.js` and a Workbox precache with local fonts, icon and app assets.
- `npm run e2e:offline`: passed against production preview after service worker installation and control; cached app/data reloaded with network offline.
- `npm audit --omit=dev --audit-level=high`: passed, 0 production vulnerabilities. Development dependency audit retains low/moderate findings.

Browser emulation and screenshots at 320 px verified light Home and dark Reports. A horizontal filter overflow found during QA was fixed; document width then measured 320 px on all four tabs. No physical iOS device was available, so Safari and installed PWA behavior remain manual release checks.

## Installed-iPhone checklist

1. Open in Safari, install to Home Screen, and relaunch standalone.
2. Check status bar and Dynamic Island in light/dark themes while scrolling; check no content appears unreadably behind them.
3. Check tab bar stays above Home Indicator at narrow widths, with long labels and keyboard open.
4. Open expense/income forms and Jalali sheet; verify focus, scrolling and dismissal with keyboard.
5. Warm cache, enable airplane mode, close/reopen and reload; verify local records remain.
6. Deploy a newer build, keep an unsaved form open, verify update prompt waits until form closes, then update.
7. Export JSON, import on a different browser/origin if needed, and verify counts.

## Limits

A browser PWA cannot call EventKit or guarantee scheduled notifications while closed; calendar action copies details for a user to paste. No `.ics` download is offered. Cloudflare Pages alone does not provide a scheduled push service. IndexedDB can be removed by browser/OS cleanup and is scoped to a device and hostname. No actual-device check or Cloudflare deployment is claimed.

## Deployment and font fix — 2026-11-15

Removed the catch-all `_redirects` rule that Cloudflare rejected with error 100324. A fresh build contains no `dist/_redirects`. Replaced Vazirmatn package assets with the user-provided `AradVF.woff2`; build output contains one local Arad font asset, the service-worker precache references it, and the production browser test confirms the font loads and remains available through offline reload. Lint, typecheck, 13 unit tests, 5 browser E2E tests, build, and production offline E2E passed after this change. Cloudflare deployment itself was not retried from this environment.

## User-provided icon crop — 2026-11-15

Cropped the supplied 1024 px logo directly to a 700 px square around its central green tile; the ribbon artwork was not redrawn. Generated 192 px and 512 px manifest icons and a 180 px Apple Touch Icon from that crop. Build, lint, typecheck, 13 unit tests, 5 browser E2E tests, and 2 production PWA tests passed. All three icon URLs are included in the service-worker precache.
