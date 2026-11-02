/**
 * ESPN public data client.
 *
 * Everything here talks to ESPN's public (keyless) endpoints and normalises the
 * responses into the exact shapes the ScoreHub pages already render
 * (`src/data/sportsData.js`). If ESPN is unreachable — offline, blocked by a
 * corporate proxy, rate limited — the callers keep the bundled demo data and
 * surface a status badge instead of breaking the page.
 *
 * Endpoints used:
 *   - scoreboard: /apis/site/v2/sports/{sport}/{league}/scoreboard
 *   - standings:  /apis/v2/sports/{sport}/{league}/standings
 *   - leaders:    /apis/common/v3/sports/{sport}/{league}/leaders (best effort)
 *
 * Requests go straight to ESPN from the browser (their public API sends
 * permissive CORS headers). Each request also has a same-origin proxy fallback
 * (`/espn`, `/espn-web`) which the Vite dev server forwards server-side, so the
 * app still works behind strict CORS setups and in the sandbox preview.
 */

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

const trimTrailingSlash = (value) => String(value).replace(/\/+$/, "");

export const ESPN_SITE_BASE = trimTrailingSlash(
  env.VITE_ESPN_SITE_BASE_URL || "https://site.api.espn.com"
);
export const ESPN_WEB_BASE = trimTrailingSlash(
  env.VITE_ESPN_WEB_BASE_URL || "https://site.web.api.espn.com"
);
export const ESPN_SITE_PROXY = "/espn";
export const ESPN_WEB_PROXY = "/espn-web";

const SCOREBOARD_TTL = 30 * 1000;
const STANDINGS_TTL = 5 * 60 * 1000;
const LEADERS_TTL = 60 * 60 * 1000;
const REQUEST_TIMEOUT = 12 * 1000;

/** ESPN league slugs we know how to place in the existing competition filters. */
export const ESPN_LEAGUES = {
  nba: {
    key: "nba",
    sport: "basketball",
    path: "basketball/nba",
    competitionId: "nba",
    competition: "NBA",
    country: "United States",
  },
  wnba: {
    key: "wnba",
    sport: "basketball",
    path: "basketball/wnba",
    competitionId: "wnba",
    competition: "WNBA",
    country: "United States",
  },
  nbl: {
    key: "nbl",
    sport: "basketball",
    path: "basketball/nbl",
    competitionId: "nbl",
    competition: "NBL",
    country: "Australia",
  },
  euroleague: {
    key: "euroleague",
    sport: "basketball",
    path: "basketball/euroleague",
    competitionId: "euroleague",
    competition: "EuroLeague",
    country: "Europe",
  },
  nfl: {
    key: "nfl",
    sport: "football",
    path: "football/nfl",
    competitionId: "nfl",
    competition: "NFL",
    country: "United States",
  },
};

/** Leagues merged into the basketball scoreboard, in display order. */
export const BASKETBALL_LIVE_LEAGUES = ["nba", "wnba", "nbl", "euroleague"];

/** Leagues merged into the NFL scoreboard. */
export const FOOTBALL_LIVE_LEAGUES = ["nfl"];

const NFL_COMPETITION_NAMES = {
  nfl: "NFL",
  preseason: "NFL Preseason",
  playoffs: "NFL Playoffs",
};

const NFL_CONFERENCES = {
  BUF: "AFC", MIA: "AFC", NE: "AFC", NYJ: "AFC",
  BAL: "AFC", CIN: "AFC", CLE: "AFC", PIT: "AFC",
  HOU: "AFC", IND: "AFC", JAX: "AFC", TEN: "AFC",
  DEN: "AFC", KC: "AFC", LAC: "AFC", LV: "AFC",
  DAL: "NFC", NYG: "NFC", PHI: "NFC", WAS: "NFC",
  CHI: "NFC", DET: "NFC", GB: "NFC", MIN: "NFC",
  ATL: "NFC", CAR: "NFC", NO: "NFC", TB: "NFC",
  ARI: "NFC", LAR: "NFC", SF: "NFC", SEA: "NFC",
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const asArray = (value) => (Array.isArray(value) ? value : []);
const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pad2 = (value) => String(value).padStart(2, "0");

const unique = (values) => [...new Set(values.filter(Boolean))];

function buildQuery(params = {}) {
  if (typeof URLSearchParams === "undefined") return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function hasProxyBase(base, proxy) {
  return trimTrailingSlash(base) === proxy;
}

/** Direct ESPN URL first, same-origin dev/edge proxy second. */
function withProxyFallback(base, proxy, path) {
  const direct = `${trimTrailingSlash(base)}${path}`;
  if (hasProxyBase(base, proxy)) return [direct];
  return unique([direct, `${proxy}${path}`]);
}

// ---------------------------------------------------------------------------
// Request layer (in-memory cache + in-flight de-duplication)
// ---------------------------------------------------------------------------

const cache = new Map();
const inFlight = new Map();

export class EspnRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "EspnRequestError";
    this.status = status;
  }
}

async function fetchJson(url, timeout = REQUEST_TIMEOUT) {
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const response = await fetch(url, {
      signal: controller?.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new EspnRequestError(`ESPN ${response.status} for ${url}`, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new EspnRequestError(`ESPN request timed out for ${url}`);
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fetch the first working URL from a list, caching the normalised JSON payload.
 * @param {string[]} urls candidate URLs, in priority order
 * @param {{ ttl?: number, force?: boolean, timeout?: number }} options
 */
export async function requestEspn(urls, { ttl = SCOREBOARD_TTL, force = false, timeout = REQUEST_TIMEOUT } = {}) {
  const candidates = unique(urls);
  if (!candidates.length) throw new EspnRequestError("No ESPN endpoint configured");

  const now = Date.now();
  if (!force) {
    for (const url of candidates) {
      const hit = cache.get(url);
      if (hit && hit.expires > now) return hit.data;
    }
  }

  const key = candidates[0];
  if (!force && inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    let lastError = null;
    for (const url of candidates) {
      try {
        const data = await fetchJson(url, timeout);
        cache.set(url, { data, expires: Date.now() + ttl });
        return data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new EspnRequestError("ESPN request failed");
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export function clearEspnCache() {
  cache.clear();
  inFlight.clear();
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

function requireLeague(leagueKey) {
  const league = ESPN_LEAGUES[leagueKey];
  if (!league) throw new EspnRequestError(`Unknown ESPN league: ${leagueKey}`);
  return league;
}

export function scoreboardUrls(leagueKey, { date, week, seasonType, limit = 100 } = {}) {
  const league = requireLeague(leagueKey);
  const path = `/apis/site/v2/sports/${league.path}/scoreboard${buildQuery({
    limit,
    dates: date,
    week,
    seasontype: seasonType,
  })}`;
  return withProxyFallback(ESPN_SITE_BASE, ESPN_SITE_PROXY, path);
}

export function standingsUrls(leagueKey, { season } = {}) {
  const league = requireLeague(leagueKey);
  const path = `/apis/v2/sports/${league.path}/standings${buildQuery({ season })}`;
  return withProxyFallback(ESPN_SITE_BASE, ESPN_SITE_PROXY, path);
}

export function leadersUrls(leagueKey) {
  const league = requireLeague(leagueKey);
  const path = `/apis/common/v3/sports/${league.path}/leaders`;
  return withProxyFallback(ESPN_WEB_BASE, ESPN_WEB_PROXY, path);
}

// ---------------------------------------------------------------------------
// Scoreboard normalisation
// ---------------------------------------------------------------------------

const ordinal = (value) => {
  const suffixes = ["th", "st", "nd", "rd"];
  const remainder = value % 100;
  return `${value}${suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]}`;
};

function periodLabel(sport, period) {
  if (!Number.isFinite(period) || period <= 0) return "";
  if (sport === "football") return period > 4 ? "OT" : ordinal(period);
  return period > 4 ? "OT" : `Q${period}`;
}

export function formatKickoff(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "TBD";
  try {
    const label = date.toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return label.replace(",", " ·");
  } catch {
    return "TBD";
  }
}

const COUNTRY_LABELS = {
  USA: "United States",
  "United States": "United States",
  GBR: "United Kingdom",
  ENG: "United Kingdom",
  "United Kingdom": "United Kingdom",
};

function venueCountry(venue, fallback) {
  const raw = venue?.address?.country;
  if (!raw) return fallback;
  return COUNTRY_LABELS[raw] || raw;
}

function competitionFor(event, league, sport) {
  if (sport !== "football") {
    return { id: league.competitionId, name: league.competition };
  }
  const seasonType = toNumber(event?.season?.type, null);
  if (seasonType === 1) return { id: "preseason", name: NFL_COMPETITION_NAMES.preseason };
  if (seasonType === 3) return { id: "playoffs", name: NFL_COMPETITION_NAMES.playoffs };
  return {
    id: league.competitionId,
    name: NFL_COMPETITION_NAMES[league.competitionId] || league.competition,
  };
}

const teamLogo = (team) =>
  team?.logo ?? asArray(team?.logos)[0]?.href ?? null;

function broadcastName(competition) {
  const names = asArray(competition?.broadcasts).flatMap((entry) => asArray(entry?.names));
  if (names.length) return names[0];
  const media = competition?.media;
  return asArray(media?.shortName)[0] ?? media?.shortName ?? null;
}

function normalizeEvent(event, league, sport, index) {
  const competition = asArray(event?.competitions)[0] ?? {};
  const competitors = asArray(competition.competitors);
  if (competitors.length < 2) return null;

  const home =
    competitors.find((entry) => entry.homeAway === "home") ?? competitors[0];
  const away =
    competitors.find((entry) => entry.homeAway === "away") ?? competitors[1];

  const status = competition.status ?? event.status ?? {};
  const type = status.type ?? {};
  const state = type.state ?? "pre";
  const gameStatus =
    state === "in" ? "LIVE" : state === "post" ? "FINAL" : "UPCOMING";

  const period = toNumber(status.period, 0);
  const displayClock = status.displayClock && status.displayClock !== "0:00" ? status.displayClock : "";

  let clock;
  if (gameStatus === "LIVE") {
    clock = [periodLabel(sport, period), displayClock].filter(Boolean).join(" · ");
  } else if (gameStatus === "FINAL") {
    clock = period > 4 ? `Final / ${period > 5 ? `${period - 4}OT` : "OT"}` : "Final";
  } else {
    clock = formatKickoff(event.date);
  }

  const scoreOf = (competitor) => {
    if (gameStatus === "UPCOMING") return null;
    const value = toNumber(competitor?.score, null);
    return value === null ? null : Math.round(value);
  };

  const homeTeam = home.team ?? {};
  const awayTeam = away.team ?? {};
  const competitionInfo = competitionFor(event, league, sport);
  const venue = competition.venue ?? {};

  return {
    id: event.id ?? `${league.key}-${index}`,
    competitionId: competitionInfo.id,
    competition: competitionInfo.name,
    country: venueCountry(venue, league.country),
    conference: NFL_CONFERENCES[homeTeam.abbreviation] ?? undefined,
    status: gameStatus,
    clock,
    home: homeTeam.displayName ?? homeTeam.name ?? "TBD",
    away: awayTeam.displayName ?? awayTeam.name ?? "TBD",
    homeCode: homeTeam.abbreviation ?? "—",
    awayCode: awayTeam.abbreviation ?? "—",
    homeLogo: teamLogo(homeTeam),
    awayLogo: teamLogo(awayTeam),
    homeScore: scoreOf(home),
    awayScore: scoreOf(away),
    broadcast: broadcastName(competition),
    venue: venue.fullName ?? "Venue TBD",
    startTime: event.date ?? null,
    league: league.key,
  };
}

/**
 * ESPN scoreboard payload → array of games in the shape `GameCard` expects.
 */
export function normalizeScoreboard(payload, { league = "nba" } = {}) {
  const config = typeof league === "string" ? requireLeague(league) : league;
  const sport = config.sport ?? "basketball";
  return asArray(payload?.events)
    .map((event, index) => normalizeEvent(event, config, sport, index))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Standings normalisation
// ---------------------------------------------------------------------------

function formatPct(value) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "—";
  const fixed = numeric.toFixed(3);
  return fixed.startsWith("0.") ? fixed.slice(1) : fixed;
}

function formatGamesBehind(value) {
  if (value === null || value === undefined) return "—";
  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "0" || raw === "0.0" || raw === "—") return "—";
  return raw;
}

const STAT_ALIASES = {
  p: ["gamesPlayed"],
  w: ["wins"],
  l: ["losses"],
  t: ["ties"],
  pct: ["winPercent", "winPct", "percentage"],
  gb: ["gamesBehind"],
  streak: ["streak"],
  pf: ["pointsFor"],
  pa: ["pointsAgainst"],
};

function statValue(stats, names) {
  for (const name of names) {
    const stat = stats.get(name);
    if (!stat) continue;
    const numeric = toNumber(stat.value, null);
    if (numeric !== null) return numeric;
    const parsed = toNumber(stat.displayValue, null);
    if (parsed !== null) return parsed;
  }
  return null;
}

function statDisplay(stats, names) {
  for (const name of names) {
    const stat = stats.get(name);
    if (!stat) continue;
    if (stat.displayValue !== undefined && stat.displayValue !== "") {
      return String(stat.displayValue);
    }
    if (stat.value !== undefined && stat.value !== null) return String(stat.value);
  }
  return null;
}

function normalizeStandingRow(entry) {
  const team = entry?.team ?? entry;
  const stats = new Map(
    asArray(entry?.stats).map((stat) => [stat.name ?? stat.abbreviation, stat])
  );

  const wins = statValue(stats, STAT_ALIASES.w);
  const losses = statValue(stats, STAT_ALIASES.l);
  const ties = statValue(stats, STAT_ALIASES.t);
  const gamesPlayed =
    statValue(stats, STAT_ALIASES.p) ??
    (wins !== null && losses !== null ? wins + losses + (ties ?? 0) : null);

  const pctValue =
    toNumber(statValue(stats, STAT_ALIASES.pct), null) ??
    (wins !== null && gamesPlayed ? wins / gamesPlayed : null);

  return {
    team: team.displayName ?? team.name ?? "TBD",
    code: team.abbreviation ?? "—",
    logo: teamLogo(team),
    p: gamesPlayed ?? "—",
    w: wins ?? "—",
    l: losses ?? "—",
    t: ties ?? 0,
    pct: formatPct(pctValue ?? statDisplay(stats, STAT_ALIASES.pct)),
    gb: formatGamesBehind(statDisplay(stats, STAT_ALIASES.gb)),
    streak: statDisplay(stats, STAT_ALIASES.streak) ?? "—",
    pf: statValue(stats, STAT_ALIASES.pf) ?? "—",
    pa: statValue(stats, STAT_ALIASES.pa) ?? "—",
    _pct: pctValue ?? -1,
  };
}

/**
 * ESPN standings payload → the `{ group, rows }` groups the table renders.
 * Handles both flat roots and conference → division nesting.
 */
export function normalizeStandings(payload, { prefix = "" } = {}) {
  const groups = [];

  const visit = (node) => {
    if (!isPlainObject(node)) return;
    const entries = asArray(
      node.standings?.entries ?? node.standings?.entry ?? node.entries
    );
    if (entries.length) {
      const label = [prefix, node.name].filter(Boolean).join(" · ");
      groups.push({
        group: label || node.abbreviation || "Standings",
        rows: entries
          .map(normalizeStandingRow)
          .filter((row) => row.team !== "TBD")
          .sort((a, b) => b._pct - a._pct)
          .map((row) => {
            const clean = { ...row };
            delete clean._pct;
            return clean;
          }),
      });
    }
    asArray(node.children).forEach(visit);
  };

  visit(payload);

  // De-duplicate groups that sometimes appear twice at different depths.
  const seen = new Set();
  return groups.filter((group) => {
    if (seen.has(group.group)) return false;
    seen.add(group.group);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Leaders normalisation (best effort — endpoint shape is not documented)
// ---------------------------------------------------------------------------

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function findLeaderLists(node, out = [], depth = 0) {
  if (depth > 5 || !node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((item) => findLeaderLists(item, out, depth + 1));
    return out;
  }
  if (Array.isArray(node.leaders) && node.leaders.length) {
    out.push({ label: node.displayName ?? node.name ?? node.shortName, entries: node.leaders });
  }
  Object.values(node).forEach((value) => {
    if (value && typeof value === "object") findLeaderLists(value, out, depth + 1);
  });
  return out;
}

export function normalizeLeaders(payload, { sport = "basketball" } = {}) {
  const lists = findLeaderLists(payload);
  const sportPath = sport === "football" ? "nfl" : "nba";
  const leaders = [];
  const seenMetrics = new Set();

  lists.forEach(({ label, entries }) => {
    const metric = String(label || "Season leaders").replace(/\s*leaders?$/i, "").trim();
    if (!metric || seenMetrics.has(metric)) return;
    const top = asArray(entries)
      .map((entry) => {
        const athlete = entry.athlete ?? entry.player ?? {};
        const name = athlete.displayName ?? athlete.fullName ?? athlete.name ?? entry.displayName;
        const value = entry.displayValue ?? entry.value;
        if (!name || value === undefined || value === null) return null;
        const team = athlete.team ?? entry.team ?? {};
        const headshot =
          athlete.headshot?.href ??
          (athlete.id ? `https://a.espncdn.com/i/headshots/${sportPath}/players/full/${athlete.id}.png` : null);
        return {
          name,
          team: team.displayName ?? "—",
          teamAbbr: team.abbreviation ?? null,
          teamLogo: teamLogo(team),
          position: athlete.position?.abbreviation ?? athlete.position?.name ?? null,
          headshot,
          metric,
          value: String(value),
          initials: initials(name),
        };
      })
      .filter(Boolean)[0];
    if (!top) return;
    seenMetrics.add(metric);
    leaders.push(top);
  });

  return leaders.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

export async function loadScoreboard(leagueKey, { date, week, seasonType, force = false } = {}) {
  const data = await requestEspn(scoreboardUrls(leagueKey, { date, week, seasonType }), {
    ttl: SCOREBOARD_TTL,
    force,
  });
  const league = requireLeague(leagueKey);
  return {
    games: normalizeScoreboard(data, { league }),
    meta: {
      week: toNumber(data?.week?.number, null),
      seasonType: toNumber(data?.season?.type, null),
      seasonYear: toNumber(data?.season?.year, null),
    },
  };
}

export async function loadStandings(leagueKey, { season, force = false } = {}) {
  const data = await requestEspn(standingsUrls(leagueKey, { season }), {
    ttl: STANDINGS_TTL,
    force,
  });
  const league = requireLeague(leagueKey);
  return normalizeStandings(data, {
    sport: league.sport,
    prefix: league.sport === "basketball" ? league.competition : "",
  });
}

export async function loadLeaders(leagueKey, { force = false } = {}) {
  const data = await requestEspn(leadersUrls(leagueKey), {
    ttl: LEADERS_TTL,
    force,
  });
  return normalizeLeaders(data, { sport: requireLeague(leagueKey).sport });
}

async function mergeScoreboards(leagueKeys, options) {
  const results = await Promise.allSettled(
    leagueKeys.map((key) => loadScoreboard(key, options))
  );

  const games = [];
  const meta = {};
  let successes = 0;

  results.forEach((result) => {
    if (result.status !== "fulfilled") return;
    successes += 1;
    games.push(...result.value.games);
    Object.assign(meta, result.value.meta);
  });

  if (!successes) {
    throw new EspnRequestError("ESPN scoreboards are unreachable");
  }

  return { games, meta };
}

export async function fetchBasketballSnapshot({ date, force = false, season } = {}) {
  const { games, meta } = await mergeScoreboards(BASKETBALL_LIVE_LEAGUES, { date, force });

  let standings = null;
  try {
    // ESPN indexes basketball seasons by their end year (2025 → 2024-25).
    standings = await loadStandings("nba", { force, season });
  } catch {
    standings = null; // scores still render with the demo standings table
  }

  return { games, standings, meta };
}

export async function fetchFootballSnapshot({ week, seasonType, force = false } = {}) {
  const { games, meta } = await mergeScoreboards(FOOTBALL_LIVE_LEAGUES, { week, seasonType, force });

  let standings = null;
  try {
    standings = await loadStandings("nfl", { force });
  } catch {
    standings = null;
  }

  return { games, standings, meta };
}

export const SNAPSHOT_FETCHERS = {
  basketball: fetchBasketballSnapshot,
  football: fetchFootballSnapshot,
};

/** ESPN integration is skipped in unit tests and when explicitly disabled. */
export function isEspnDisabled() {
  if (env.MODE === "test") return true;
  return String(env.VITE_ESPN_DISABLE ?? "") === "1";
}

/** Exported for tests / debugging: human readable status counts. */
export function summarizeGames(games = []) {
  return games.reduce(
    (acc, game) => {
      acc.total += 1;
      if (game.status === "LIVE") acc.live += 1;
      else if (game.status === "UPCOMING") acc.upcoming += 1;
      else if (game.status === "FINAL") acc.final += 1;
      return acc;
    },
    { total: 0, live: 0, upcoming: 0, final: 0 }
  );
}

export { pad2 };
