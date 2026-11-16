# Implementation status

Phase: release candidate, local verification complete.

Decisions: Empty target directory became a static React/Vite app. IndexedDB is the sole authoritative data store. Amounts are positive safe integer tomans; aggregate overflow throws. Local civil Gregorian ISO dates are stored and converted to Jalali in the UI. The referenced MIT `shadcn-persian` DatePicker imports private `@workspace/ui` components and Base UI, so a self-contained Jalali adapter is used. Apple Calendar integration is a user-initiated copy fallback because a browser PWA cannot use EventKit or reliably open a prefilled native editor without an `.ics` workflow.

Completed: app shell, themes, touch-safe navigation, PWA assets and update prompt, stores/indexes/migration, empty and demo onboarding, transaction CRUD/search/filter/repeat, reports with periods/filters/trend/comparison, obligations/recurrence/completion, settings management, JSON/CSV export and JSON import/reset, CI, tests and docs.

External boundaries: no actual iPhone or installed iOS PWA check. The user reported that Cloudflare deployment failed on the existing `_redirects` rule. The local branch tracks `origin/main`; this fix is to be committed locally for the user to deploy. No successful Cloudflare deployment is verified here.

Next: commit the fix, then the user can push or redeploy using their existing Cloudflare setup and perform the manual installed-iPhone checklist in `QA_REPORT.md`.

Deployment fix (2026-11-15): removed the looping catch-all `_redirects` rule. Pages has native SPA fallback without a top-level 404 page. Replaced Vazirmatn with the user-provided local Arad variable WOFF2 font; no runtime font request to a third party.

PWA icon revision (2026-11-15): replaced the earlier generated concepts with the user-provided logo. Versioned PNG URLs avoid stale icon assets in the PWA cache.

PWA icon frame correction (2026-11-15): edited the user-provided logo to remove its pre-rounded tile/frame and extend the green background edge to edge. The final master is `design/app-icon-fullbleed-master.png`; generated 192/512 px manifest icons and 180 px Apple Touch Icon. The OS applies the icon mask; versioned icon URLs prevent stale cache reuse.

Dashboard and update verification (2026-11-16): confirmed the Home card already displays the selected Jalali month's expense total prominently, including at 320 px viewport width. Added a browser assertion for its label, amount and font size. Added explicit service-worker update checks on registration, foreground resume, return online and hourly while open; the prompt still waits until editors close before becoming visible. Local automated checks pass; installed-iPhone verification remains manual.

Form polish (2026-11-16): editable controls use at least 16 px text to avoid Safari's small-field focus zoom without disabling user pinch zoom. Transaction and obligation amount fields group Persian digits while typing and retain a safe integer for storage. Settings now offers a user-initiated service-worker update check; available updates still require the update banner confirmation.
