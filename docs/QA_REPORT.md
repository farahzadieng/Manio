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

## Version 1.5 update — 2026-11-23

The screen and editor components were extracted from `App.tsx` with the existing DOM structure and callbacks preserved. Unit coverage now includes the most recently recorded active source, Gregorian month boundaries, once-per-month reminder claims, v3→v4 settings migration, and older backup defaults. Mobile E2E covers the ۱٫۵ label, source preselection, starred repeat, toast dismissal and reload persistence, 320 px overflow, tab separation, and dark token styling. Final local release gate passed: `npm run lint`, `npm run typecheck`, `npm test` (23 tests), `npm run build` (manifest, service worker and 9 precached entries), `npm run e2e` (8 tests), `npm run e2e:offline` (4 tests), and `git diff --check`. Installed iOS Safari/PWA behavior still requires direct verification.

After push, GitHub CI for source commit `6eeb921` completed successfully. The production hostname served the same versioned JavaScript asset as the local build. This confirms the new bundle is available from the public site; installed iOS PWA update behavior remains unverified without the device.

## Version 2.0 update — 2026-11-24

Local release gate passed: lint, typecheck, 26 unit/integration tests, production build, 9 mobile Chromium E2E tests, 4 production offline PWA tests, and diff whitespace check. New browser coverage verifies analysis response storage after reload and editing an existing payment source color. The Gemini endpoint was tested with a mocked upstream; no private key or live Gemini charge was used. Cloudflare deployment and installed iOS Safari still need verification in their real environments.

Version 2.0.1 prompt refinement (2026-11-24): Unit coverage checks prior-month context, repeated same-day spending, incomplete-month handling, and absence of an explicit output length cap. Mobile E2E checks that the next month’s request contains the saved prior-month recommendation. Live Gemini output quality still requires a user key and real service response.

Version 2.1 transition update (2026-11-24): Browser coverage checks switching tabs with the sequential fade-through and verifies that reduced-motion removes the per-element animation. The bottom navigation remains available throughout the transition.

Local v2.1 release gate: lint, typecheck, 28 unit tests, production build, 10 mobile Chromium E2E tests, 4 offline PWA tests, and whitespace check passed. Mobile transition frames were inspected at exit, entrance and settled states.

## Version 2.1.1 Gemini connection repair — 2026-11-24

The deployed site's `POST /api/analyze` returned HTTP 405, so the Cloudflare Function path could not complete an analysis. A real Chromium request from the local app origin to Google's `generateContent` endpoint reached Google and returned HTTP 400 `API_KEY_INVALID` for a deliberately invalid test key, confirming browser CORS and network access without using a private key. The app now requests Gemini directly and its CSP permits only Google's Gemini API as an additional connection origin. Local release checks passed: lint, typecheck, 29 unit tests, build, 10 browser E2E tests, and 4 offline PWA tests. A real successful analysis still requires the user's own key and a post-deployment check on their device.

## Version 2.1.2 Gemini fallback and manual responses — 2026-11-24

Google documents 503 as temporary service overload and 429 as quota exhaustion. The app now starts with Gemini 2.5 Flash, retries a temporary overload once, and tries 2.5 Flash-Lite when the primary model stays unavailable or reaches a quota limit. The manual paste flow saves an agent response in the same monthly history and includes it in the next month's prompt. Local checks passed: lint, typecheck, 32 unit tests, production build, 11 mobile browser E2E tests, and 4 offline PWA tests. The manual paste test was repeated three times after its completion check was tied to the saved confirmation. The mobile paste sheet was visually inspected. A real successful Gemini request with the user's key remains untested in this environment.
