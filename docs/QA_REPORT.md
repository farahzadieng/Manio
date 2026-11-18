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

## Full-bleed icon correction — 2026-11-15

The initial direct crop retained an inset rounded frame. An image edit based on the user-provided logo removed that frame and extended the green field to all square edges so the OS can mask the installed icon. The central ribbon was retained visually, though the edited result is not pixel-identical to the source. Updated 192 px, 512 px and 180 px assets with versioned URLs. Build, lint, typecheck, 13 unit tests, 5 browser E2E tests and 2 production PWA tests passed; all icon URLs are in the service-worker precache.

## Dashboard and update verification — 2026-11-16

At 320 px viewport width, Home showed the label «هزینه‌های ثبت‌شده این ماه» and the demo total «۳۰۵٬۰۰۰ تومان» in a 26 px amount line with no horizontal overflow. A browser assertion now protects this presentation. Lint, typecheck, 13 unit tests, production build, 5 mobile E2E tests, and 3 production PWA tests passed. The new PWA test confirms a service-worker update check on app resume. Actual installed-iOS update behavior remains unverified without a device.

## Form input and manual update check — 2026-11-16

All editable text controls were raised to at least 16 px in CSS without disabling pinch zoom. Transaction and obligation amount fields now group digits live (for example `40000` → `۴۰٬۰۰۰`) while keeping stored amounts as integer tomans. Automated checks: 16 unit tests, 6 mobile browser E2E tests, 4 production PWA tests, lint, typecheck and build passed. Browser tests verify grouped input, middle-of-number editing, form control font sizes and the Settings update-check action. Actual Safari focus zoom and installed-PWA update activation still require the manual iPhone checklist.

## Version 1.0 update — 2026-11-19

Lint, typecheck, 19 unit/integration tests, production build, 7 mobile Chromium E2E tests and 4 production PWA tests passed. New checks cover v2→v3 transaction migration, old backup import, newest active source selection, Settings version display, starring and repeating a transaction with a new record, and retained offline reload/update behavior. The initial browser run connected to an unrelated app already listening on port 4173; the Playwright config now uses port 4187 with strict binding, and the rerun passed. The initially supplied `.com` hostname was incorrect. `curl -I` to `https://manio.luminiastudio.ir` returned HTTP 200 on 2026-11-19, but this does not verify that the latest local commit is deployed. Real installed-iPhone behavior is still covered by the manual checklist above, not claimed as tested.
