# Implementation status

Phase: release candidate, local verification complete.

Decisions: Empty target directory became a static React/Vite app. IndexedDB is the sole authoritative data store. Amounts are positive safe integer tomans; aggregate overflow throws. Local civil Gregorian ISO dates are stored and converted to Jalali in the UI. The referenced MIT `shadcn-persian` DatePicker imports private `@workspace/ui` components and Base UI, so a self-contained Jalali adapter is used. Apple Calendar integration is a user-initiated copy fallback because a browser PWA cannot use EventKit or reliably open a prefilled native editor without an `.ics` workflow.

Completed: app shell, themes, touch-safe navigation, PWA assets and update prompt, stores/indexes/migration, empty and demo onboarding, transaction CRUD/search/filter/repeat, reports with periods/filters/trend/comparison, obligations/recurrence/completion, settings management, JSON/CSV export and JSON import/reset, CI, tests and docs.

External boundaries: no actual iPhone or installed iOS PWA check; no Cloudflare deployment or GitHub push. Cloudflare project credentials and push authorization were not established in this session. `gh` is not installed locally. The intended remote exists and has no HEAD commit.

Next: review the local release commit, authorize push, connect Cloudflare Pages to the repository, and execute the manual installed-iPhone checklist in `QA_REPORT.md`.
