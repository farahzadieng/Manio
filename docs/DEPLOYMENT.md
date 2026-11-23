# Deployment

## Cloudflare Pages

Connect `https://github.com/farahzadieng/Manio` to a Pages project. Use project name `Manio` if accepted by Cloudflare, Node 22, build command `npm run build`, output directory `dist`, root directory `/`. `_headers` sets security headers. There is deliberately no `_redirects`: Cloudflare Pages serves the root page for unknown paths in an SPA when no top-level `404.html` exists. A catch-all rewrite to `/index.html` can fail deployment with error 100324 (infinite loop). If deploying as a Worker instead of Pages and using client routes, configure static assets `not_found_handling: "single-page-application"` in Wrangler rather than adding that catch-all rewrite. The project includes a same-origin Cloudflare Pages Function at `/api/analyze` for optional Gemini analysis. It needs no client build variables or server database. The user enters a personal Gemini API key in Settings; the key and selected month expense table pass through that Function to Google only when analysis is requested. Verify that the Pages build includes this Function after deployment. Keep the HTTPS production hostname stable: a different hostname has a separate IndexedDB origin. Export/import JSON to migrate.

## Local verification

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
npm run e2e:offline
npm run preview
```

On a new machine, install a Playwright browser with `npx playwright install chromium` before E2E. Local macOS tests can use installed Google Chrome via the Playwright config; CI uses Chromium.

The latest deploy status must be checked in Cloudflare; a local build does not prove deployment. Commit changes locally, then push when authorized to trigger the connected deployment. Do not put financial data or tokens in client build variables.

## Publishing the current local commits

The local `main` branch contains the fix for Cloudflare error 100324: there is no longer a catch-all `_redirects` file. To publish all local commits to the configured GitHub remote, run `git push origin main`. If the Cloudflare project is connected to that repository and automatic production deployments are enabled for `main`, the push starts a new deployment. Check the Cloudflare deployment log and confirm that its commit SHA matches the latest Git commit. If the project uses a manual Wrangler deployment instead, a Git push alone will not deploy it; run the deployment command configured for that project after a successful build.

## Updating an installed PWA

The app uses a versioned Workbox precache and `registerType: "prompt"`. When it detects a new service worker, it shows a Persian update banner; the user chooses when to reload. The banner is hidden while a transaction or obligation editor is open. The app checks for updates on launch, when brought back to the foreground, when network connectivity returns, and hourly while open. A network connection and the **same origin** are required; moving to another hostname creates a different app installation and IndexedDB store.

For each release, verify on an installed phone: (1) deploy and confirm the new commit in Cloudflare, (2) reopen the installed app while online, (3) wait for and tap the update banner, (4) confirm a visible change from the new version, and (5) reopen in airplane mode to check cached assets and local records. Browser E2E tests cover offline reload and update checks, but the installed iOS flow still needs this real-device check. Never clear site data as an update step because that can remove IndexedDB records.

Settings also offers **بررسی نسخه تازه**. It requests an immediate service-worker update check while online. If a new version is ready, the existing update banner lets the user activate it and reload. A check cannot manufacture a version that Cloudflare has not deployed, and the app does not reload automatically during editing.
