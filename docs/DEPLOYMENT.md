# Deployment

## Cloudflare Pages

Connect `https://github.com/farahzadieng/Manio` to a Pages project. Use project name `Manio` if accepted by Cloudflare, Node 22, build command `npm run build`, output directory `dist`, root directory `/`. `_headers` sets security headers and `_redirects` returns `index.html` for SPA navigation. The project needs no client environment variables, secrets, Workers, functions or database. Keep the HTTPS production hostname stable: a different hostname has a separate IndexedDB origin. Export/import JSON to migrate.

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

No GitHub push or Cloudflare deployment has been performed. Push the reviewed local commit to the intended remote branch only after authorization and Git credentials are available, then connect Pages. Do not put financial data or tokens in client build variables.
