# ScoreHub · Basketball + NFL live dashboard

Dark, broadcast-style sports dashboard built with React + Vite. Scores, standings and player leaders come from ESPN's public (keyless) endpoints, with bundled demo data as an automatic offline fallback.

## Interface

- **Icon rail** on the far left with the app mark and section shortcuts.
- **Top bar** with sport tabs (Basketball, Football, Cricket, Badminton, Hockey), search, notifications, a working light/dark theme switch (persisted in `localStorage`) and the profile chip.
- **League sidebar**: continent filter, the full competition list, gender filter and countries with flags. Rows narrow each other and filter the dashboard in place; the section chevrons expand a list that is taller than the panel.
- **Featured game hero** with the live matchup, venue, broadcast and clock.
- **Live Score panel**: season pill, viewer time-zone chip, day/week rail, status tabs (ALL / LIVE / UPCOMING / FINAL), search, match cards with real team logos, live clocks, scores and broadcasters.
- **Player Details rail** with photo (or team-coloured monogram) cards and a stats strip.
- **Standings** grouped into conference/division cards, plus competition snapshot tiles.
- Responsive down to phones: the rail hides, the header wraps onto two rows so all five sport tabs stay reachable, columns stack, and a phone-only section tab bar (Live / Standings / Filters / Players) jumps straight to the panels that would otherwise be buried below the scores.

Sports without a feed yet (Cricket, Badminton, Hockey) render a placeholder page inside the same shell instead of pretending to have data.

## Included

- `src/pages/BasketballPage.jsx` — global basketball dashboard: continent / competition / gender / country / season filters, date rail, status tabs and search.
- `src/pages/NFLPage.jsx` — NFL dashboard, season stage + week rail + conference filters.
- `src/pages/ComingSoonPage.jsx` — placeholder for sports that don't have a feed yet.
- `src/components/` — shell (rail/top bar), league sidebar, hero, score panel, match cards, player cards, standings, UI primitives, icon set.
- `src/api/espn.js` — ESPN client and normalisers.
- `src/hooks/useEspnFeed.js` — polling hook that swaps demo data for live data.
- `src/data/sportsData.js` — demo data (scores, standings, leaders, team logos, broadcasters) used for the first paint and offline mode.
- `src/utils/` — date/week rails and dashboard helpers.

## Mobile layout

Below 960px the icon rail is hidden and the three dashboard columns stack. To keep the desktop components reachable, both dashboards render a fixed bottom **section tab bar**:

| Tab | Jumps to | Desktop equivalent |
| --- | --- | --- |
| Live | Featured game | Centre column, top |
| Standings | League standings panel | Centre column, below the scores |
| Filters | Continent / competition / gender / country sidebar | Left sidebar |
| Players | Player Details rail | Right column |

- Each tab smooth-scrolls to its `#section-*` target, clears the sticky header (`scroll-margin-top`) and stays highlighted while that section is in view; the page reserves bottom padding so the bar never covers the last row.
- The tabs are `display: none` above 960px, so the desktop layout is untouched, and they are plain buttons with `aria-current` — keyboard and screen-reader friendly.
- The top bar wraps to two rows below 960px (brand and actions, then the full-width sports switcher), fixing the clipped "Footb…" tab on narrow phones.

## Basketball coverage and filters

`src/data/sportsData.js` catalogues 40 competitions (id, name, short code, colour, country, continent, gender, optional ESPN slug). Seven regions are represented:

| Region | Competitions |
| --- | --- |
| Africa (7) | Basketball Africa League, Women's Basketball League Africa, Kenya NBL, Kenya Women's Basketball League, Nigeria NBPL, Egypt EBSL, Senegal N1 |
| Europe (13) | EuroLeague, EuroCup, Basketball Champions League, Liga ACB, BBL, LBA, LNB Élite, Greek Basket League, ABA League, EuroLeague Women, EuroCup Women, EuroBasket, EuroBasket Women |
| Asia (7) | Chinese CBA, Japan B.LEAGUE, Korea KBL, Philippines PBA, WJBL, WCBA, FIBA Asia Cup |
| North America (3) | NBA, WNBA, NBA G League |
| Oceania (2) | NBL, WNBL |
| South America (2) | Liga Nacional Argentina, Basketball Champions League Americas |
| International (6) | FIBA World Cup and Women's World Cup, FIBA Olympic qualifiers, Olympic Qualifying Tournaments, FIBA 3x3 men's and women's series |

Four of them are mapped to live ESPN scoreboards (`nba`, `wnba`, `euroleague`, `nbl`); the rest are demo-only until ESPN exposes a slug, and the dashboard keeps rendering them from demo data.

Filters compose in a single pass — every one of them narrows the games, the hero, the standings label and the sidebar options at the same time:

- **Continent** (with *All continents*) picks the region.
- **Competition** (the sidebar list) is filtered by continent, gender, country and search; a selection that no longer matches falls back to *All competitions* instead of showing an empty page.
- **Gender** (Men / Women / All) uses each competition's `gender`, so the list shows M/W tags and the header counts update.
- **Country** (with flags) is derived from the remaining continent/gender selection.
- **Season** (a `<select>` on the Live Score panel) offers the current season and the two before it. Choosing one re-queries ESPN with ESPN's end-year convention (`season start + 1`) and moves the date rail to today (current season) or 1 February of the season's end year (historical seasons).

Status tabs (ALL / LIVE / UPCOMING / FINAL), team search, the day rail and competition selection are additive: a game must match all of them.

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
- **Kick-offs follow the viewer's clock.** Every upcoming game is rendered from its ISO `startTime` with `Intl.DateTimeFormat` in the device time zone, so the day label and time move with the viewer — a tip-off in Kigali reads `Today · 20:00` for a Nairobi viewer (GMT+3) and `17:00` for a London one. The Live Score header carries a `GMT+3`-style chip naming the active zone (`title`/`aria-label` give the IANA zone). Demo fixtures generate their tip-offs relative to the current clock instead of hard-coding times.

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
