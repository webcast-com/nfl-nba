/**
 * Sportsrc data client.
 *
 * Sportsrc is a keyed JSON API (https://api.sportsrc.org/v3/) for global
 * basketball fixtures — the "matches" feed returns league-grouped games with
 * live/upcoming/finished scores and team badges. This client normalises that
 * payload into the exact shapes the ScoreHub pages already render
 * (`src/data/sportsData.js`), so cards, status chips and the live rail keep
 * working unchanged.
 *
 * The key is read from `VITE_SPORTSRC_API_KEY` and sent as the `X-API-KEY`
 * header (recommended by the API docs). A query-parameter fallback
 * (`api_key=…`) is added to the candidate URL list for environments where
 * custom headers are stripped or CORS-preflighted, and a same-origin proxy
 * (`/sportsrc`) keeps the endpoint reachable behind strict browsers — the
 * same pattern `src/api/espn.js` uses for ESPN.
 *
 * Endpoints used:
 *   - matches:  /v3/?type=matches&sport={sport}&status={status}&date={date}
 *   - detail:   /v3/?type=detail&id={match_id} (venue, referee, streaming
 *               sources — the `sources[].embedUrl` is rendered in an iframe)
 */

import { formatKickoff } from "../utils/dates";
import { slugify } from "../utils/entities";

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

const trimTrailingSlash = (value) => String(value).replace(/\/+$/, "");

export const SPORTSRC_BASE = trimTrailingSlash(
  env.VITE_SPORTSRC_BASE_URL || "https://api.sportsrc.org/v3"
);
export const SPORTSRC_PROXY = "/sportsrc";

const MATCHES_TTL = 60 * 1000;
const DETAIL_TTL = 60 * 1000;
const REQUEST_TIMEOUT = 12 * 1000;

/** License key from the build environment. Never hard-code it in source. */
export function getSportsrcKey() {
  return String(env.VITE_SPORTSRC_API_KEY ?? "").trim();
}

export function hasSportsrcKey() {
  return getSportsrcKey().length > 0;
}

/** Sportsrc is skipped in unit tests and when explicitly disabled. */
export function isSportsrcDisabled() {
  if (env.MODE === "test") return true;
  return String(env.VITE_SPORTSRC_DISABLE ?? "") === "1";
}

const asArray = (value) => (Array.isArray(value) ? value : []);
const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

// ---------------------------------------------------------------------------
// Request layer (in-memory cache + in-flight de-duplication)
// ---------------------------------------------------------------------------

const cache = new Map();
const inFlight = new Map();

export class SportsrcRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "SportsrcRequestError";
    this.status = status;
  }
}

async function fetchSportsrcJson(url, apiKey, timeout = REQUEST_TIMEOUT) {
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const response = await fetch(url, {
      signal: controller?.signal,
      headers: apiKey
        ? { Accept: "application/json", "X-API-KEY": apiKey }
        : { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new SportsrcRequestError(`Sportsrc ${response.status} for ${url}`, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new SportsrcRequestError(`Sportsrc request timed out for ${url}`);
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fetch the first working URL from a list, caching the raw JSON payload.
 * @param {string[]} urls candidate URLs, in priority order
 * @param {{ ttl?: number, force?: boolean, timeout?: number, apiKey?: string }} options
 */
export async function requestSportsrc(
  urls,
  { ttl = MATCHES_TTL, force = false, timeout = REQUEST_TIMEOUT, apiKey = getSportsrcKey() } = {}
) {
  const candidates = unique(urls);
  if (!candidates.length) throw new SportsrcRequestError("No Sportsrc endpoint configured");

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
        const data = await fetchSportsrcJson(url, apiKey, timeout);
        cache.set(url, { data, expires: Date.now() + ttl });
        return data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new SportsrcRequestError("Sportsrc request failed");
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export function clearSportsrcCache() {
  cache.clear();
  inFlight.clear();
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

/**
 * Candidate URLs for `?type=matches`, in priority order:
 *  1. direct, key in header
 *  2. same-origin proxy, key in header
 *  3. direct, key as `api_key` query parameter (header-stripping fallback)
 *  4. proxy, key as `api_key` query parameter
 *
 * `status`/`date` are optional: omitting them keeps the server's default
 * window (everything upcoming + live + recently finished around now), which is
 * what the panel renders. Explicit values must follow the API contract —
 * `status` ∈ inprogress | upcoming | finished, `date` = YYYY-MM-DD.
 */
export function matchesUrls({
  sport = "basketball",
  status = null,
  date = null,
  apiKey = getSportsrcKey(),
} = {}) {
  const params = { type: "matches", sport, status, date };
  const query = buildQuery(params); // already prefixed with "?"
  const direct = `${SPORTSRC_BASE}${query}`;
  const urls = [direct, `${SPORTSRC_PROXY}${query}`];
  if (apiKey) {
    const withKey = `${query}&api_key=${encodeURIComponent(apiKey)}`;
    urls.push(`${SPORTSRC_BASE}${withKey}`, `${SPORTSRC_PROXY}${withKey}`);
  }
  return unique(urls);
}

/**
 * Candidate URLs for `?type=detail&id={id}`, in the same priority order as
 * `matchesUrls`: direct, same-origin proxy, key as `api_key` query parameter,
 * and the proxy again with the key. The `detail` endpoint is what carries the
 * streaming sources (`sources[].embedUrl`) the panel renders in an iframe.
 */
export function detailUrls({ id, apiKey = getSportsrcKey() } = {}) {
  if (!id) return [];
  const params = { type: "detail", id };
  const query = buildQuery(params); // already prefixed with "?"
  const direct = `${SPORTSRC_BASE}${query}`;
  const urls = [direct, `${SPORTSRC_PROXY}${query}`];
  if (apiKey) {
    const withKey = `${query}&api_key=${encodeURIComponent(apiKey)}`;
    urls.push(`${SPORTSRC_BASE}${withKey}`, `${SPORTSRC_PROXY}${withKey}`);
  }
  return unique(urls);
}

// ---------------------------------------------------------------------------
// Payload normalisation → the game shape `MatchCard` / `FeaturedGame` render
// ---------------------------------------------------------------------------

const STATUS_MAP = {
  inprogress: "LIVE",
  live: "LIVE",
  running: "LIVE",
  finished: "FINAL",
  post: "FINAL",
  ended: "FINAL",
  upcoming: "UPCOMING",
  scheduled: "UPCOMING",
  notstarted: "UPCOMING",
  pre: "UPCOMING",
};

/** Sportsrc's lowercase status strings → the app's uppercase states. */
export function normalizeStatus(value) {
  return STATUS_MAP[String(value ?? "").toLowerCase()] ?? "UPCOMING";
}

function normalizeLeague(league, fallbackKey) {
  if (!isPlainObject(league)) {
    return { key: fallbackKey, name: "Unknown league", country: null, logo: null, flag: null };
  }
  const name = league.name ?? "Unknown league";
  return {
    key: slugify(name) || fallbackKey,
    name,
    country: league.country ?? null,
    logo: league.logo ?? null,
    flag: league.flag ?? null,
  };
}

function normalizeMatch(match, league, index) {
  if (!isPlainObject(match)) return null;
  const teams = isPlainObject(match.teams) ? match.teams : {};
  const home = isPlainObject(teams.home) ? teams.home : {};
  const away = isPlainObject(teams.away) ? teams.away : {};
  const score = isPlainObject(match.score) ? match.score : {};
  const current = isPlainObject(score.current) ? score.current : {};

  const status = normalizeStatus(match.status);
  const timestamp = toNumber(match.timestamp, null);
  const startTime = timestamp !== null ? new Date(timestamp).toISOString() : null;
  // Live games carry a human clock in status_detail ("1st half", "Halftime", …).
  const liveDetail = String(match.status_detail ?? "").trim();
  const clock =
    status === "LIVE"
      ? liveDetail && !/^(live|inprogress)$/i.test(liveDetail)
        ? liveDetail
        : "Live"
      : status === "FINAL"
        ? "Final"
        : formatKickoff(startTime);

  return {
    id: match.id ?? `${league.key}-${index}`,
    competitionId: league.key,
    competition: league.name,
    country: league.country,
    status,
    clock,
    home: home.name ?? "TBD",
    away: away.name ?? "TBD",
    homeCode: home.code ?? "—",
    awayCode: away.code ?? "—",
    homeLogo: home.badge ?? null,
    awayLogo: away.badge ?? null,
    // Scores are only present once the game has tipped off.
    homeScore: status === "UPCOMING" ? null : toNumber(current.home, null),
    awayScore: status === "UPCOMING" ? null : toNumber(current.away, null),
    broadcast: null,
    venue: "Venue TBD",
    startTime,
    league: league.key,
    source: "sportsrc",
  };
}

/**
 * Sportsrc `?type=matches` payload → array of games in the shape the
 * scoreboard components expect. Leagues with no matches are dropped.
 */
export function normalizeMatches(payload) {
  return asArray(payload?.data)
    .map((group, leagueIndex) => {
      const league = normalizeLeague(group?.league, `league-${leagueIndex}`);
      return asArray(group?.matches)
        .map((match, index) => normalizeMatch(match, league, index))
        .filter(Boolean);
    })
    .flat();
}

// ---------------------------------------------------------------------------
// Match detail normalisation (venue, referee, streaming sources)
// ---------------------------------------------------------------------------

/**
 * Sportsrc `?type=detail` payload → the full match record, including the
 * `sources` array whose `embedUrl` values are meant to be rendered inside an
 * `<iframe>` (see the API docs: no `sandbox` attribute, standard permissions).
 */
export function normalizeDetail(payload) {
  const data = payload?.data;
  if (!isPlainObject(data)) return null;
  const match = isPlainObject(data.match_info) ? data.match_info : data;
  const teams = isPlainObject(match.teams) ? match.teams : {};
  const home = isPlainObject(teams.home) ? teams.home : {};
  const away = isPlainObject(teams.away) ? teams.away : {};
  const score = isPlainObject(match.score) ? match.score : {};
  const current = isPlainObject(score.current) ? score.current : {};
  const league = isPlainObject(match.league) ? match.league : {};
  const info = isPlainObject(data.info) ? data.info : {};
  const venue = isPlainObject(info.venue) ? info.venue : {};
  const referee = isPlainObject(info.referee) ? info.referee : {};

  const sources = asArray(data.sources)
    .map((source) => {
      if (!isPlainObject(source)) return null;
      const embedUrl = source.embedUrl ?? source.embed_url ?? source.url ?? null;
      if (!embedUrl) return null;
      return {
        id: source.id ?? null,
        source: source.source ?? source.source_name ?? null,
        embedUrl,
        hd: Boolean(source.hd),
        language: source.language ?? null,
      };
    })
    .filter(Boolean);

  const timestamp = toNumber(match.timestamp, null);
  const startTime = timestamp !== null ? new Date(timestamp).toISOString() : null;
  const status = normalizeStatus(match.status);
  const statusDetail = String(match.status_detail ?? "").trim();

  return {
    id: match.id ?? null,
    competition: league.name ?? null,
    country: league.country ?? null,
    status,
    statusDetail: statusDetail && !/^(live|inprogress)$/i.test(statusDetail) ? statusDetail : null,
    home: home.name ?? "TBD",
    away: away.name ?? "TBD",
    homeCode: home.code ?? "—",
    awayCode: away.code ?? "—",
    homeLogo: home.badge ?? null,
    awayLogo: away.badge ?? null,
    homeScore: toNumber(current.home, null),
    awayScore: toNumber(current.away, null),
    venue: venue.stadium ?? null,
    referee: referee.name ?? null,
    startTime,
    sources,
  };
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

export async function loadMatches({
  sport = "basketball",
  status = null,
  date = null,
  force = false,
} = {}) {
  const apiKey = getSportsrcKey();
  if (!apiKey) throw new SportsrcRequestError("Missing Sportsrc API key");
  const data = await requestSportsrc(matchesUrls({ sport, status, date, apiKey }), {
    ttl: MATCHES_TTL,
    force,
    apiKey,
  });
  return normalizeMatches(data);
}

/**
 * Full match record for one fixture, including the streaming sources used to
 * render the livestream embed. Throws when the id or key is missing.
 */
export async function loadMatchDetail({ id, force = false } = {}) {
  if (!id) throw new SportsrcRequestError("Missing Sportsrc match id");
  const apiKey = getSportsrcKey();
  if (!apiKey) throw new SportsrcRequestError("Missing Sportsrc API key");
  const data = await requestSportsrc(detailUrls({ id, apiKey }), {
    ttl: DETAIL_TTL,
    force,
    apiKey,
  });
  return normalizeDetail(data);
}
