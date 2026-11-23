# Implementation status

Phase: version 2.1 implementation complete; local release verification passed.

Decisions: Empty target directory became a static React/Vite app. IndexedDB is the sole authoritative data store. Amounts are positive safe integer tomans; aggregate overflow throws. Local civil Gregorian ISO dates are stored and converted to Jalali in the UI. The referenced MIT `shadcn-persian` DatePicker imports private `@workspace/ui` components and Base UI, so a self-contained Jalali adapter is used. Apple Calendar integration is a user-initiated copy fallback because a browser PWA cannot use EventKit or reliably open a prefilled native editor without an `.ics` workflow.

Completed: app shell, themes, touch-safe navigation, PWA assets and update prompt, stores/indexes/migration, empty and demo onboarding, transaction CRUD/search/filter/repeat, reports with periods/filters/trend/comparison, obligations/recurrence/completion, settings management, JSON/CSV export and JSON import/reset, CI, tests and docs.

External boundaries: no actual iPhone or installed iOS PWA check. The corrected public hostname is `manio.luminiastudio.ir`.

Next: perform the manual installed-iPhone checklist in `QA_REPORT.md` after the phone receives the PWA update.

Deployment fix (2026-11-15): removed the looping catch-all `_redirects` rule. Pages has native SPA fallback without a top-level 404 page. Replaced Vazirmatn with the user-provided local Arad variable WOFF2 font; no runtime font request to a third party.

PWA icon revision (2026-11-15): replaced the earlier generated concepts with the user-provided logo. Versioned PNG URLs avoid stale icon assets in the PWA cache.

PWA icon frame correction (2026-11-15): edited the user-provided logo to remove its pre-rounded tile/frame and extend the green background edge to edge. The final master is `design/app-icon-fullbleed-master.png`; generated 192/512 px manifest icons and 180 px Apple Touch Icon. The OS applies the icon mask; versioned icon URLs prevent stale cache reuse.

Dashboard and update verification (2026-11-16): confirmed the Home card already displays the selected Jalali month's expense total prominently, including at 320 px viewport width. Added a browser assertion for its label, amount and font size. Added explicit service-worker update checks on registration, foreground resume, return online and hourly while open; the prompt still waits until editors close before becoming visible. Local automated checks pass; installed-iPhone verification remains manual.

Form polish (2026-11-16): editable controls use at least 16 px text to avoid Safari's small-field focus zoom without disabling user pinch zoom. Transaction and obligation amount fields group Persian digits while typing and retain a safe integer for storage. Settings now offers a user-initiated service-worker update check; available updates still require the update banner confirmation.

Version 1.0 update (2026-11-19): Settings displays version ۱٫۰ from package SemVer 1.0.0. Transaction editor supports explicit starring; Home repeats starred transactions with amount, category, source, necessity and note, creating a new ID and today's date. New expenses default to the most recently created active payment source. IndexedDB schema v3 migrates old transactions to unstarred; older backups import with the same default. README is concise English with direct-use and Cloudflare fork guidance. Root Architecture.md maps the code and change path. Release checks passed locally: lint, typecheck, 19 unit tests, 7 mobile browser E2E tests, build and 4 production PWA tests. The initially supplied `.com` hostname was incorrect; the corrected `.ir` hostname returned HTTP 200. The latest commit's deployment and installed-iPhone behavior remain unverified.

Version 1.5 update (2026-11-23): Split the formerly 1,996-line `App.tsx` into an approximately 550-line orchestration component, three screen modules, and editor/settings/shared UI modules without changing the existing screen flow. A monthly Gregorian backup toast is claimed atomically in IndexedDB and appears on open/resume if no backup has been exported or reminder shown that month. New expenses use the active payment source from the most recently created source-bearing transaction, with the newest active source as an empty-history fallback. Schema v4 migrates reminder state; old backups remain importable. Package version is 1.5.0 and Settings displays ۱٫۵.

Local gate for v1.5: lint, typecheck, 23 unit/integration tests, production build with PWA precache, 8 mobile browser E2E tests, 4 production PWA tests, and `git diff --check` passed. Actual installed iPhone verification remains manual.

Release status (2026-11-23): source commit `6eeb921` was pushed to `origin/main`; GitHub CI completed successfully. The public hostname served the same versioned JavaScript asset (`index-CbEd-yk_.js`) as the local production build. This verifies the new static bundle is served, but not an actual installed-iPhone update.

Version 2.0 update (2026-11-24): Tab transitions, custom dropdowns, source color palette and editing, optional financial behavior prompt/Gemini analysis via Cloudflare Pages Function, and locally stored monthly analysis history. IndexedDB v5 migrates settings and adds analyses. Gemini key is excluded from JSON backups. Package version is 2.0.0.

Local v2 gate: lint, typecheck, 26 unit/integration tests, production build, 9 mobile browser E2E tests, 4 offline PWA tests, and `git diff --check` passed. Real Gemini calls and Cloudflare deployment require the user's key and production Pages environment.

Version 2.0.1 refinement (2026-11-24): The financial behavior prompt now includes current and prior month expenses, weekdays, spending reasons and the latest prior-month analysis for evidence-backed progress review. Explicit response length caps were removed. Expense notes invite reasons and allow up to 1,000 Unicode code points.

Version 2.1 update (2026-11-24): Replaced the 260 ms directional page entrance with a sequential Motion fade-through across the header and screen content. Screen groups enter with short stagger delays, navigation remains fixed, and reduced-motion settings disable the effect. Package version is 2.1.0.

Local v2.1 gate: lint, typecheck, 28 unit/integration tests, production build, 10 mobile browser E2E tests, 4 offline PWA tests, visual review of mobile transition frames, and `git diff --check` passed.
