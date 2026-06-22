# Deploying under `/minipaint/`

miniPaint is safe to serve from a sub-path when static assets are referenced with relative URLs. Before deploying, run:

```sh
npm run build
npm run check:static-paths
```

To verify a `/minipaint/` deployment locally:

```powershell
$root = Join-Path $env:TEMP "minipaint-subpath-check"
Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$root\minipaint" | Out-Null
robocopy . "$root\minipaint" /E /XD .git node_modules test-results test-reports
npx http-server $root -p 8080
```

Then open `http://127.0.0.1:8080/minipaint/`. In browser DevTools, check the Network tab for:

- no `404` responses for `dist/bundle.js`, `images/...`, worker scripts, manifest, or favicon;
- no requests to root paths such as `/dist/...`, `/images/...`, `/service-worker.js`, `/manifest.json`, or `/favicon...`;
- no console errors from failed `fetch()`, worker loading, service worker registration, or manifest loading.

If a request starts at the site root, change it to a relative path and rerun `npm run check:static-paths`.
