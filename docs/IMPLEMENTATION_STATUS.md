# Implementation status

Phase: version 1.0 implementation complete; local verification passed.

Decisions: Empty target directory became a static React/Vite app. IndexedDB is the sole authoritative data store. Amounts are positive safe integer tomans; aggregate overflow throws. Local civil Gregorian ISO dates are stored and converted to Jalali in the UI. The referenced MIT `shadcn-persian` DatePicker imports private `@workspace/ui` components and Base UI, so a self-contained Jalali adapter is used. Apple Calendar integration is a user-initiated copy fallback because a browser PWA cannot use EventKit or reliably open a prefilled native editor without an `.ics` workflow.

Completed: app shell, themes, touch-safe navigation, PWA assets and update prompt, stores/indexes/migration, empty and demo onboarding, transaction CRUD/search/filter/repeat, reports with periods/filters/trend/comparison, obligations/recurrence/completion, settings management, JSON/CSV export and JSON import/reset, CI, tests and docs.

External boundaries: no actual iPhone or installed iOS PWA check. No successful Cloudflare deployment is verified here; the intended public hostname did not resolve from this environment on 2026-11-19.

Next: publish the local commit when desired, verify the Cloudflare deployment, and perform the manual installed-iPhone checklist in `QA_REPORT.md`.

Deployment fix (2026-11-15): removed the looping catch-all `_redirects` rule. Pages has native SPA fallback without a top-level 404 page. Replaced Vazirmatn with the user-provided local Arad variable WOFF2 font; no runtime font request to a third party.

PWA icon revision (2026-11-15): replaced the earlier generated concepts with the user-provided logo. Versioned PNG URLs avoid stale icon assets in the PWA cache.

PWA icon frame correction (2026-11-15): edited the user-provided logo to remove its pre-rounded tile/frame and extend the green background edge to edge. The final master is `design/app-icon-fullbleed-master.png`; generated 192/512 px manifest icons and 180 px Apple Touch Icon. The OS applies the icon mask; versioned icon URLs prevent stale cache reuse.

Dashboard and update verification (2026-11-16): confirmed the Home card already displays the selected Jalali month's expense total prominently, including at 320 px viewport width. Added a browser assertion for its label, amount and font size. Added explicit service-worker update checks on registration, foreground resume, return online and hourly while open; the prompt still waits until editors close before becoming visible. Local automated checks pass; installed-iPhone verification remains manual.

Form polish (2026-11-16): editable controls use at least 16 px text to avoid Safari's small-field focus zoom without disabling user pinch zoom. Transaction and obligation amount fields group Persian digits while typing and retain a safe integer for storage. Settings now offers a user-initiated service-worker update check; available updates still require the update banner confirmation.

Version 1.0 update (2026-11-19): Settings displays version ۱٫۰ from package SemVer 1.0.0. Transaction editor supports explicit starring; Home repeats starred transactions with amount, category, source, necessity and note, creating a new ID and today's date. New expenses default to the most recently created active payment source. IndexedDB schema v3 migrates old transactions to unstarred; older backups import with the same default. README is concise English with direct-use and Cloudflare fork guidance. Root Architecture.md maps the code and change path. Release checks passed locally: lint, typecheck, 19 unit tests, 7 mobile browser E2E tests, build and 4 production PWA tests. The public hostname did not resolve from this environment on 2026-11-19, so live deployment remains unverified. The installed iPhone checklist remains manual.
