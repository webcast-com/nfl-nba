# Base44 sandbox notes

This repo originally shipped only page components (`src/pages`, `src/components`, `src/data`)
with no application shell. A minimal Vite + React shell was added so the pages can run:

- `index.html`, `src/main.jsx`, `src/App.jsx`, `src/app.css` — app entry, router and nav.
- Routes: `/` redirects to `/basketball`; `/nfl` renders the NFL page.
- `package.json` / `package-lock.json` — dependencies (React 18, react-router-dom, Vite 6).

## Running

`docker compose -f docker-compose.base44.yml up -d --build`

- Single `web` service (`node:22-alpine`), source bind-mounted at `/app`, `node_modules` in a
  named volume, `npm ci` then `npm run dev` on port 3000 (host port 3000).
- The repo has no backend and needs no credentials. All scores/standings are demo data in
  `src/data/sportsData.js`.
- Fonts load from Google Fonts at runtime; the UI renders fine without them.

## Sandbox-only config

`vite.config.js` appends the preview wildcard host (`.${BASE44_SANDBOX_HOST_DOMAIN}`) to
`server.allowedHosts` only when `BASE44_PREVIEW_MODE === "1"`; unset, Vite's default host
checks apply unchanged.

## Verify

`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → 200, and
`curl -s http://localhost:3000/src/main.jsx` returns JSX source (proves the dev server, not a
prebuilt bundle, is serving). No test suite exists.
