import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSportsrcCache,
  detailUrls,
  isSportsrcDisabled,
  loadMatchDetail,
  loadMatches,
  matchesUrls,
  normalizeDetail,
  normalizeMatches,
  requestSportsrc,
} from "./sportsrc";
import { formatKickoff } from "../utils/dates";

const sportsrcMatches = {
  success: true,
  filters: { sport: "basketball", status: "all", date: "upcoming" },
  total_leagues: 2,
  total_matches: 3,
  data: [
    {
      league: {
        name: "EuroLeague",
        country: "Europe",
        logo: "https://img.sportsrc.org/league.png",
      },
      matches: [
        {
          id: "real-oly-Zjox",
          title: "Real Madrid vs Olympiacos",
          timestamp: 1793804400000,
          status: "finished",
          status_detail: "Ended",
          round: "Regular Season",
          teams: {
            home: { name: "Real Madrid", code: "RMA", badge: "https://img.sportsrc.org/rma.png" },
            away: { name: "Olympiacos", code: "OLY", badge: "https://img.sportsrc.org/oly.png" },
          },
          score: { current: { home: 92, away: 88 }, display: "92 - 88" },
        },
        {
          id: "brose-bay-Zjox2",
          title: "Brose Bamberg vs Bayern Munich",
          timestamp: 1793804400000,
          status: "inprogress",
          status_detail: "2nd half",
          round: "Regular Season",
          teams: {
            home: { name: "Brose Bamberg", code: "BAM" },
            away: { name: "Bayern Munich", code: "MUN" },
          },
          score: { current: { home: 48, away: 44 } },
        },
      ],
    },
    {
      league: { name: "Liga Revelação U23", country: "Portugal" },
      matches: [
        {
          id: "uni-est-Zjox3",
          title: "União Leiria U23 vs Estoril U23",
          timestamp: 1793811600000,
          status: "upcoming",
          status_detail: "Scheduled",
          round: "Regular Season - 11",
          teams: {
            home: { name: "União Leiria U23", code: "UNI" },
            away: { name: "Estoril U23", code: "EST" },
          },
          score: { current: { home: null, away: null } },
        },
      ],
    },
  ],
};

describe("Sportsrc matches normalisation", () => {
  const games = normalizeMatches(sportsrcMatches);

  it("maps finished, live and upcoming fixtures into the game shape", () => {
    expect(games).toHaveLength(3);

    const finished = games.find((game) => game.id === "real-oly-Zjox");
    expect(finished).toMatchObject({
      id: "real-oly-Zjox",
      competitionId: "euroleague",
      competition: "EuroLeague",
      country: "Europe",
      status: "FINAL",
      clock: "Final",
      home: "Real Madrid",
      away: "Olympiacos",
      homeCode: "RMA",
      awayCode: "OLY",
      homeScore: 92,
      awayScore: 88,
      startTime: new Date(1793804400000).toISOString(),
      source: "sportsrc",
    });
    expect(finished.homeLogo).toBe("https://img.sportsrc.org/rma.png");

    const live = games.find((game) => game.id === "brose-bay-Zjox2");
    expect(live).toMatchObject({ status: "LIVE", clock: "2nd half", homeScore: 48, awayScore: 44 });
    expect(live.homeLogo).toBeNull(); // badge is optional per team

    const upcoming = games.find((game) => game.id === "uni-est-Zjox3");
    expect(upcoming).toMatchObject({
      status: "UPCOMING",
      competition: "Liga Revelação U23",
      competitionId: "liga-revelacao-u23",
      homeScore: null,
      awayScore: null,
    });
    expect(upcoming.clock).toBe(formatKickoff(new Date(1793811600000).toISOString()));
  });

  it("drops leagues without matches and tolerates empty payloads", () => {
    expect(normalizeMatches({ data: [{ league: { name: "Empty" }, matches: [] }] })).toEqual([]);
    expect(normalizeMatches(null)).toEqual([]);
    expect(normalizeMatches({ success: false, message: "rate limited" })).toEqual([]);
  });
});

describe("Sportsrc request layer", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearSportsrcCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("builds direct + proxy candidate URLs and attaches the key", () => {
    const withKey = matchesUrls({ apiKey: "SECRET" });
    expect(withKey[0]).toContain("https://api.sportsrc.org/v3?type=matches");
    expect(withKey[0]).toContain("sport=basketball");
    // The default window omits status/date — the server answers with its
    // upcoming + live + recently-finished fixture window.
    expect(withKey[0]).not.toContain("status=");
    expect(withKey[0]).not.toContain("date=");
    expect(withKey.some((url) => url.startsWith("/sportsrc?type=matches"))).toBe(true);
    expect(withKey.some((url) => url.includes("api_key=SECRET"))).toBe(true);

    const narrowed = matchesUrls({ status: "inprogress", date: "2026-11-05", apiKey: "SECRET" });
    expect(narrowed[0]).toContain("status=inprogress");
    expect(narrowed[0]).toContain("date=2026-11-05");

    const withoutKey = matchesUrls({ apiKey: "" });
    expect(withoutKey).toHaveLength(2);
    expect(withoutKey.every((url) => !url.includes("api_key"))).toBe(true);
  });

  it("falls back to the same-origin proxy and caches the payload", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, json: async () => sportsrcMatches });
    global.fetch = fetchMock;

    const urls = matchesUrls({ apiKey: "SECRET" });
    const data = await requestSportsrc(urls, { ttl: 1000 });
    expect(data.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const cached = await requestSportsrc(urls, { ttl: 1000 });
    expect(cached.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2); // served from cache
  });

  it("surfaces an error when every endpoint fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(requestSportsrc(["https://api.sportsrc.org/v3/down"])).rejects.toThrow(
      "Failed to fetch"
    );
  });

  it("sends the X-API-KEY header with every request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sportsrcMatches });
    global.fetch = fetchMock;

    await requestSportsrc(matchesUrls({ apiKey: "SECRET" }), { ttl: 1000, apiKey: "SECRET" });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["X-API-KEY"]).toBe("SECRET");
  });
});

describe("Sportsrc loader", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearSportsrcCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns normalised games for a keyed fetch", async () => {
    vi.stubEnv("VITE_SPORTSRC_API_KEY", "test-key");
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sportsrcMatches });

    const games = await loadMatches({ status: "inprogress" });
    expect(games).toHaveLength(3);
    expect(games[0]).toMatchObject({ competition: "EuroLeague", status: "FINAL" });
  });

  it("refuses to call the API without a key", async () => {
    await expect(loadMatches()).rejects.toThrow("Missing Sportsrc API key");
  });

  it("is disabled inside the test environment", () => {
    expect(isSportsrcDisabled()).toBe(true);
  });
});

describe("Sportsrc match detail (streaming)", () => {
  const originalFetch = global.fetch;

  const sportsrcDetail = {
    success: true,
    data: {
      match_info: {
        id: "botafogo-atletico-mg-Zjox",
        title: "Botafogo vs Atletico-MG",
        timestamp: 1793838600000,
        status: "inprogress",
        status_detail: "1st half",
        teams: {
          home: { name: "Botafogo", code: "BOT" },
          away: { name: "Atletico-MG", code: "ATL" },
        },
        score: { current: { home: 0, away: 0 } },
        league: { name: "Serie A", country: "Brazil" },
      },
      sources: [
        {
          id: "stream-1",
          streamNo: 1,
          embedUrl: "https://football77.org/embed/?id=1&source=lola",
          source: "lola",
          hd: true,
          language: "Unknown",
        },
        {
          id: "stream-2",
          streamNo: 2,
          embedUrl: "https://football77.org/embed/?id=1&source=STV",
          source: "STV",
          hd: true,
        },
      ],
      info: {
        venue: { stadium: "Estadio Olimpico Nilton Santos" },
        referee: { name: "Lucas Casagrande" },
      },
    },
  };

  beforeEach(() => {
    clearSportsrcCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("builds direct + proxy candidate URLs with the match id", () => {
    const withKey = detailUrls({ id: "match-1", apiKey: "SECRET" });
    expect(withKey[0]).toContain("https://api.sportsrc.org/v3?type=detail");
    expect(withKey[0]).toContain("id=match-1");
    expect(withKey.some((url) => url.startsWith("/sportsrc?type=detail"))).toBe(true);
    expect(withKey.some((url) => url.includes("api_key=SECRET"))).toBe(true);

    expect(detailUrls({ id: "match-1", apiKey: "" })).toHaveLength(2);
    expect(detailUrls({ id: "" })).toEqual([]);
  });

  it("normalises the match record and its streaming sources", () => {
    const detail = normalizeDetail(sportsrcDetail);
    expect(detail).toMatchObject({
      id: "botafogo-atletico-mg-Zjox",
      competition: "Serie A",
      country: "Brazil",
      status: "LIVE",
      statusDetail: "1st half",
      home: "Botafogo",
      away: "Atletico-MG",
      homeCode: "BOT",
      awayCode: "ATL",
      homeScore: 0,
      awayScore: 0,
      venue: "Estadio Olimpico Nilton Santos",
      referee: "Lucas Casagrande",
      startTime: new Date(1793838600000).toISOString(),
    });
    expect(detail.sources).toHaveLength(2);
    expect(detail.sources[0]).toMatchObject({
      id: "stream-1",
      source: "lola",
      embedUrl: "https://football77.org/embed/?id=1&source=lola",
      hd: true,
      language: "Unknown",
    });
    expect(detail.sources[1].source).toBe("STV");
  });

  it("tolerates payloads without sources and malformed payloads", () => {
    expect(
      normalizeDetail({ success: true, data: { match_info: { id: "x" } } }).sources
    ).toEqual([]);
    expect(normalizeDetail(null)).toBeNull();
    expect(normalizeDetail({ success: false, message: "gone" })).toBeNull();
  });

  it("loads a match detail for the keyed fetch", async () => {
    vi.stubEnv("VITE_SPORTSRC_API_KEY", "test-key");
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sportsrcDetail });

    const detail = await loadMatchDetail({ id: "botafogo-atletico-mg-Zjox" });
    expect(detail.id).toBe("botafogo-atletico-mg-Zjox");
    expect(detail.sources).toHaveLength(2);
  });

  it("refuses to load detail without an id or a key", async () => {
    vi.stubEnv("VITE_SPORTSRC_API_KEY", "test-key");
    await expect(loadMatchDetail()).rejects.toThrow("Missing Sportsrc match id");

    vi.stubEnv("VITE_SPORTSRC_API_KEY", "");
    await expect(loadMatchDetail({ id: "x" })).rejects.toThrow("Missing Sportsrc API key");
  });
});
