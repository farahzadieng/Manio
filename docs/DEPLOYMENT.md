# Deployment

## Cloudflare Pages

Connect `https://github.com/farahzadieng/Manio` to a Pages project. Use project name `Manio` if accepted by Cloudflare, Node 22, build command `npm run build`, output directory `dist`, root directory `/`. `_headers` sets security headers. There is deliberately no `_redirects`: Cloudflare Pages serves the root page for unknown paths in an SPA when no top-level `404.html` exists. A catch-all rewrite to `/index.html` can fail deployment with error 100324 (infinite loop). If deploying as a Worker instead of Pages and using client routes, configure static assets `not_found_handling: "single-page-application"` in Wrangler rather than adding that catch-all rewrite. The project needs no client environment variables, secrets, Workers, functions or database. Keep the HTTPS production hostname stable: a different hostname has a separate IndexedDB origin. Export/import JSON to migrate.

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
