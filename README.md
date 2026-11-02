# ScoreHub · Basketball + NFL live dashboard

Dark, broadcast-style sports dashboard built with React + Vite. Scores, standings and player leaders come from ESPN's public (keyless) endpoints, with bundled demo data as an automatic offline fallback.

## Interface

- **Icon rail** on the far left with the app mark and section shortcuts.
- **Top bar** with sport tabs (Basketball, Football, Cricket, Badminton, Hockey), search, notifications, a working light/dark theme switch (persisted in `localStorage`) and the profile chip.
- **League sidebar**: popular leagues/season stages, countries with flags, and conference/region filters. Selecting a row filters the dashboard in place.
- **Featured game hero** with the live matchup, venue, broadcast and clock.
- **Live Score panel**: season pill, day/week rail, status tabs (ALL / LIVE / UPCOMING / FINAL), search, match cards with real team logos, live clocks, scores and broadcasters.
- **Player Details rail** with photo (or team-coloured monogram) cards and a stats strip.
- **Standings** grouped into conference/division cards, plus competition snapshot tiles.
- Responsive down to phones: the rail hides, columns stack, sidebars move below the centre column.

Sports without a feed yet (Cricket, Badminton, Hockey) render a placeholder page inside the same shell instead of pretending to have data.

## Included

- `src/pages/BasketballPage.jsx` — global basketball dashboard, date rail, league/country/region filters.
- `src/pages/NFLPage.jsx` — NFL dashboard, season stage + week rail + conference filters.
- `src/pages/ComingSoonPage.jsx` — placeholder for sports that don't have a feed yet.
- `src/components/` — shell (rail/top bar), league sidebar, hero, score panel, match cards, player cards, standings, UI primitives, icon set.
- `src/api/espn.js` — ESPN client and normalisers.
- `src/hooks/useEspnFeed.js` — polling hook that swaps demo data for live data.
- `src/data/sportsData.js` — demo data (scores, standings, leaders, team logos, broadcasters) used for the first paint and offline mode.
- `src/utils/` — date/week rails and dashboard helpers.

## Add to a Vite React project

1. Copy the `src` folder into your project.
2. Import the page you want in your router:

```jsx
import BasketballPage from "./pages/BasketballPage";
import NFLPage from "./pages/NFLPage";

// <Route path="/basketball" element={<BasketballPage />} />
// <Route path="/nfl" element={<NFLPage />} />
```

3. Import the stylesheet once in your app entry point:

```jsx
import "./styles.css";
```

`src/App.jsx` shows the full shell (rail, top bar, routes, theme toggle).

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
- **Graceful degradation.** The page paints the bundled demo data immediately. When ESPN answers, scores/standings/leaders/stat tiles are replaced in place; team logos, broadcasters and player headshots come with them. If ESPN is unreachable the demo data stays and the chip reads `OFFLINE · DEMO`; a refresh button and a 45s retry keep trying.
- **Filters still work.** ESPN statuses map to the existing tabs (`LIVE`, `UPCOMING`, `FINAL`), NFL season stages map to the existing competition ids (`nfl`, `preseason`, `playoffs`), and venue countries feed the country filter.
- **Navigation maps to real feeds.** The basketball date rail sends `dates=YYYYMMDD`; the NFL week rail sends `week` + `seasontype`.

### Configuration

All optional, see `.env.example`:

```bash
VITE_ESPN_SITE_BASE_URL=https://site.api.espn.com   # or /espn to force the proxy
VITE_ESPN_WEB_BASE_URL=https://site.web.api.espn.com
VITE_ESPN_DISABLE=1                                  # demo data only
```

When deploying the static build without a proxy, keep the default ESPN origins (browser-direct requests). If you prefer routing ESPN traffic through your own server, set `VITE_ESPN_SITE_BASE_URL=/espn` and mirror the `vite.config.js` proxy in your host config.

Unit tests disable ESPN automatically (`import.meta.env.MODE === "test"`), so component tests assert against the demo dataset. `src/api/espn.test.js` covers the normalisers and the request fallback/cache behaviour; `src/hooks/useEspnFeed.test.jsx` covers the loading → live, offline and refresh states.

## Props

Both dashboards accept optional props. Anything you pass wins over ESPN and disables polling for that page, so the components remain pure/controllable:

- `games`
- `competitions`
- `countries`
- `standings`
- `leaders`
- `stats`
- `lastUpdated`
- `live` — set `false` to skip all ESPN requests and stay on demo data

See `src/data/sportsData.js` for the expected shapes, and `src/api/espn.js` for how ESPN payloads are mapped onto them.
