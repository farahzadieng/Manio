# Implementation status

Phase: release candidate, local verification complete.

Decisions: Empty target directory became a static React/Vite app. IndexedDB is the sole authoritative data store. Amounts are positive safe integer tomans; aggregate overflow throws. Local civil Gregorian ISO dates are stored and converted to Jalali in the UI. The referenced MIT `shadcn-persian` DatePicker imports private `@workspace/ui` components and Base UI, so a self-contained Jalali adapter is used. Apple Calendar integration is a user-initiated copy fallback because a browser PWA cannot use EventKit or reliably open a prefilled native editor without an `.ics` workflow.

Completed: app shell, themes, touch-safe navigation, PWA assets and update prompt, stores/indexes/migration, empty and demo onboarding, transaction CRUD/search/filter/repeat, reports with periods/filters/trend/comparison, obligations/recurrence/completion, settings management, JSON/CSV export and JSON import/reset, CI, tests and docs.

External boundaries: no actual iPhone or installed iOS PWA check. The user reported that Cloudflare deployment failed on the existing `_redirects` rule. The local branch tracks `origin/main`; this fix is to be committed locally for the user to deploy. No successful Cloudflare deployment is verified here.

Next: commit the fix, then the user can push or redeploy using their existing Cloudflare setup and perform the manual installed-iPhone checklist in `QA_REPORT.md`.

Deployment fix (2026-11-15): removed the looping catch-all `_redirects` rule. Pages has native SPA fallback without a top-level 404 page. Replaced Vazirmatn with the user-provided local Arad variable WOFF2 font; no runtime font request to a third party.
