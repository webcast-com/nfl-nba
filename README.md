# ScoreHub Basketball + NFL pages

Responsive React page components for a dark ScoreHub-style sports dashboard, now backed by ESPN's public (keyless) endpoints with the bundled demo data as an automatic fallback.

## Included
- `BasketballPage.jsx`: competition and country filters, scoreboard date picker, live/recent/upcoming game cards, league standings, player leaders and team statistics.
- `NFLPage.jsx`: season stage/week pickers and conference filters, game cards, AFC/NFC standings, team leaders and league statistics.
- `src/api/espn.js`: ESPN client — URL builders, 30s response cache, request de-duplication, timeouts, proxy fallback and normalisers for scores/standings/leaders.
- `src/hooks/useEspnFeed.js`: polling hook (45s, paused in background tabs) that swaps demo data for live ESPN data and exposes a sync status badge.
- Shared UI components and responsive CSS.
- Sample data in `src/data/sportsData.js` (still the offline/first-paint fallback).

## Add to a Vite React project

1. Copy the `src` folder into your project.
2. Import the page you want in your router:

```jsx
import BasketballPage from "./pages/BasketballPage";
import NFLPage from "./pages/NFLPage";

// Example routes:
// <Route path="/basketball" element={<BasketballPage />} />
// <Route path="/nfl" element={<NFLPage />} />
```

3. Import the stylesheet once in your app entry point:

```jsx
import "./styles.css";
```

## ESPN integration

| What | Endpoint |
| --- | --- |
| NBA / WNBA / NBL / EuroLeague scores | `site.api.espn.com/apis/site/v2/sports/basketball/{nba,wnba,nbl,euroleague}/scoreboard` |
| NBA standings | `site.api.espn.com/apis/v2/sports/basketball/nba/standings` |
| NFL scores (preseason / regular / postseason) | `site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` |
| NFL standings (AFC/NFC → divisions) | `site.api.espn.com/apis/v2/sports/football/nfl/standings` |
| Season leaders (best effort) | `site.web.api.espn.com/apis/common/v3/sports/{basketball/nba,football/nfl}/leaders` |

How it behaves:

- **No API key.** ESPN's public endpoints are keyless and send `Access-Control-Allow-Origin: *`, so the browser calls them directly. Each request also has a same-origin fallback (`/espn`, `/espn-web`) that the Vite dev/preview server proxies server-side (`vite.config.js`).
- **Graceful degradation.** The page paints the bundled demo data immediately. When ESPN answers, scores/standings/leaders/stat tiles are replaced in place. If ESPN is unreachable the demo data stays and the badge reads `OFFLINE · DEMO`; a refresh button and automatic retry every 45s keep trying.
- **Filters still work.** ESPN statuses map to the existing tabs (`LIVE`, `UPCOMING`, `FINAL`), NFL season stages map to the existing competition ids (`nfl`, `preseason`, `playoffs`), and venue countries feed the country filter.
- **New controls, same look.** Basketball gets a date stepper (`dates=YYYYMMDD`) and NFL gets week + season-stage pickers (`week` + `seasontype`), all styled with the existing filter bar.

### Configuration

All optional, see `.env.example`:

```bash
VITE_ESPN_SITE_BASE_URL=https://site.api.espn.com   # or /espn to force the proxy
VITE_ESPN_WEB_BASE_URL=https://site.web.api.espn.com
VITE_ESPN_DISABLE=1                                  # demo data only
```

When deploying the static build without a proxy, keep the default ESPN origins (browser-direct requests). If you prefer routing ESPN traffic through your own server, set `VITE_ESPN_SITE_BASE_URL=/espn` and mirror the `vite.config.js` proxy in your host config.

Unit tests disable ESPN automatically (`import.meta.env.MODE === "test"`), so the existing component tests still assert against the demo dataset. `src/api/espn.test.js` covers the normalisers and the request fallback/cache behaviour with mocked `fetch`.

## Props

Both pages accept optional props. Anything you pass wins over ESPN and disables polling for that page, so the components remain pure/controllable:

- `games`
- `competitions`
- `countries`
- `standings`
- `leaders`
- `stats`
- `lastUpdated`
- `live` — set `false` to skip all ESPN requests and stay on demo data

See `src/data/sportsData.js` for the expected shapes, and `src/api/espn.js` for how ESPN payloads are mapped onto them.
