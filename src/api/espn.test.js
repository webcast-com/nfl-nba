import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearEspnCache,
  formatKickoff,
  fetchBasketballSnapshot,
  isEspnDisabled,
  leagueKeyForCompetition,
  liveLeaguesFor,
  normalizeLeaderboard,
  normalizeLeaders,
  normalizeScoreboard,
  normalizeStandings,
  normalizeSummary,
  requestEspn,
  scoreboardUrls,
  standingsUrls,
} from "./espn";
import { shiftDateKey, toDateKey } from "../utils/dates";

const nbaScoreboard = {
  events: [
    {
      id: "401234567",
      date: "2025-11-02T00:30:00Z",
      season: { type: 2, slug: "regular-season" },
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "84", team: { displayName: "Boston Celtics", abbreviation: "BOS" } },
            { homeAway: "away", score: "79", team: { displayName: "New York Knicks", abbreviation: "NYK" } },
          ],
          venue: { fullName: "TD Garden", address: { country: "USA" } },
          status: { period: 3, displayClock: "4:32", type: { state: "in", completed: false } },
        },
      ],
    },
    {
      id: "401234568",
      date: "2025-11-02T23:00:00Z",
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "0", team: { displayName: "Real Madrid", abbreviation: "RMA" } },
            { homeAway: "away", score: "0", team: { displayName: "Olympiacos", abbreviation: "OLY" } },
          ],
          venue: { fullName: "WiZink Center", address: { country: "Spain" } },
          status: { period: 0, displayClock: "0:00", type: { state: "pre", completed: false } },
        },
      ],
    },
  ],
};

const nflScoreboard = {
  week: { number: 9 },
  events: [
    {
      id: "401671800",
      date: "2026-01-18T20:00:00Z",
      season: { type: 3, slug: "post-season" },
      competitions: [
        {
          competitors: [
            { homeAway: "home", score: "31", team: { displayName: "Kansas City Chiefs", abbreviation: "KC" } },
            { homeAway: "away", score: "27", team: { displayName: "Buffalo Bills", abbreviation: "BUF" } },
          ],
          venue: { fullName: "Arrowhead Stadium", address: { country: "USA" } },
          status: { period: 5, displayClock: "0:00", type: { state: "post", completed: true } },
        },
      ],
    },
  ],
};

const nbaStandings = {
  children: [
    {
      name: "Eastern Conference",
      standings: {
        entries: [
          {
            team: { displayName: "New York Knicks", abbreviation: "NYK" },
            stats: [
              { name: "gamesPlayed", value: 82 },
              { name: "wins", value: 50, displayValue: "50" },
              { name: "losses", value: 32, displayValue: "32" },
              { name: "winPercent", displayValue: "0.610" },
              { name: "gamesBehind", displayValue: "11.0" },
              { name: "streak", displayValue: "W2" },
            ],
          },
          {
            team: { displayName: "Boston Celtics", abbreviation: "BOS" },
            stats: [
              { name: "gamesPlayed", value: 82 },
              { name: "wins", value: 61, displayValue: "61" },
              { name: "losses", value: 21, displayValue: "21" },
              { name: "winPercent", displayValue: "0.744" },
              { name: "gamesBehind", displayValue: "-" },
              { name: "streak", displayValue: "W4" },
            ],
          },
        ],
      },
    },
  ],
};

const nflStandings = {
  children: [
    {
      name: "American Football Conference",
      children: [
        {
          name: "AFC East",
          standings: {
            entries: [
              {
                team: { displayName: "Buffalo Bills", abbreviation: "BUF" },
                stats: [
                  { name: "gamesPlayed", value: 17 },
                  { name: "wins", value: 11, displayValue: "11" },
                  { name: "losses", value: 6, displayValue: "6" },
                  { name: "ties", value: 0, displayValue: "0" },
                  { name: "winPercent", displayValue: "0.647" },
                  { name: "pointsFor", value: 451 },
                  { name: "pointsAgainst", value: 311 },
                  { name: "streak", displayValue: "W3" },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("ESPN scoreboard normalisation", () => {
  it("maps an in-progress basketball game to the page shape", () => {
    const [live] = normalizeScoreboard(nbaScoreboard, { league: "nba" });
    expect(live).toMatchObject({
      id: "401234567",
      competitionId: "nba",
      competition: "NBA",
      country: "United States",
      status: "LIVE",
      clock: "Q3 · 4:32",
      home: "Boston Celtics",
      away: "New York Knicks",
      homeCode: "BOS",
      awayCode: "NYK",
      homeScore: 84,
      awayScore: 79,
      venue: "TD Garden",
    });
  });

  it("keeps pre-game scores empty and shows the kick-off time", () => {
    const [, upcoming] = normalizeScoreboard(nbaScoreboard, { league: "nba" });
    expect(upcoming.status).toBe("UPCOMING");
    expect(upcoming.homeScore).toBeNull();
    expect(upcoming.awayScore).toBeNull();
    expect(upcoming.country).toBe("Spain");
    expect(upcoming.clock).toBe(formatKickoff("2025-11-02T23:00:00Z"));
  });

  it("supports merged basketball leagues", () => {
    const [game] = normalizeScoreboard(nbaScoreboard, { league: "euroleague" });
    expect(game.competitionId).toBe("euroleague");
    expect(game.competition).toBe("EuroLeague");
  });

  it("maps NFL postseason games and conference", () => {
    const [game] = normalizeScoreboard(nflScoreboard, { league: "nfl" });
    expect(game).toMatchObject({
      competitionId: "playoffs",
      competition: "NFL Playoffs",
      status: "FINAL",
      clock: "Final / OT",
      conference: "AFC",
      homeScore: 31,
    });
  });
});

describe("ESPN standings normalisation", () => {
  it("reads NBA conferences and sorts by win percentage", () => {
    const [group] = normalizeStandings(nbaStandings, { sport: "basketball", prefix: "NBA" });
    expect(group.group).toBe("NBA · Eastern Conference");
    expect(group.rows.map((row) => row.code)).toEqual(["BOS", "NYK"]);
    expect(group.rows[0]).toMatchObject({ p: 82, w: 61, l: 21, pct: ".744", gb: "—", streak: "W4" });
    expect(group.rows[1].gb).toBe("11.0");
  });

  it("unwraps nested NFL conference → division groups", () => {
    const groups = normalizeStandings(nflStandings, { sport: "football" });
    expect(groups).toHaveLength(1);
    expect(groups[0].group).toBe("AFC East");
    expect(groups[0].rows[0]).toMatchObject({
      team: "Buffalo Bills",
      code: "BUF",
      p: 17,
      w: 11,
      l: 6,
      t: 0,
      pct: ".647",
      pf: 451,
      pa: 311,
    });
  });

  it("tolerates empty payloads", () => {
    expect(normalizeStandings(null)).toEqual([]);
  });
});

describe("ESPN leaders normalisation", () => {
  it("reads category leaders when the endpoint provides them", () => {
    const leaders = normalizeLeaders({
      categories: [
        {
          name: "Points Per Game",
          leaders: [
            {
              displayValue: "33.9",
              athlete: {
                id: "3945274",
                displayName: "Luka Dončić",
                position: { abbreviation: "PG" },
                team: { displayName: "Dallas Mavericks", abbreviation: "DAL" },
              },
            },
          ],
        },
      ],
    });
    expect(leaders[0]).toMatchObject({
      name: "Luka Dončić",
      team: "Dallas Mavericks",
      metric: "Points Per Game",
      value: "33.9",
      initials: "LD",
    });
    expect(leaders[0].headshot).toContain("a.espncdn.com/i/headshots/nba/players/full/3945274.png");
    expect(leaders[0]).toMatchObject({ position: "PG", teamAbbr: "DAL" });
  });

  it("returns an empty list for unexpected shapes", () => {
    expect(normalizeLeaders({ nonsense: true })).toEqual([]);
  });
});

describe("ESPN leaderboard normalisation", () => {
  const payload = {
    categories: [
      {
        name: "Points Per Game",
        leaders: [
          {
            displayValue: "33.9",
            athlete: {
              id: "3945274",
              displayName: "Luka Dončić",
              team: { displayName: "Dallas Mavericks", abbreviation: "DAL" },
            },
          },
        ],
      },
    ],
  };

  it("carries a headshot so the top scorers screen can show the player", () => {
    const boards = normalizeLeaderboard(payload);
    expect(boards[0].metric).toBe("Points Per Game");
    expect(boards[0].entries[0].headshot).toContain("/i/headshots/nba/players/full/3945274.png");
  });

  it("uses the NFL headshot path for football", () => {
    const boards = normalizeLeaderboard(payload, { sport: "football" });
    expect(boards[0].entries[0].headshot).toContain("/i/headshots/nfl/players/full/3945274.png");
  });
});

describe("ESPN streaming broadcasts", () => {
  it("detects streaming broadcasts and the network from the summary header", () => {
    const summary = normalizeSummary({
      header: {
        competitions: [
          {
            broadcasts: [
              {
                market: "national",
                names: ["ESPN+"],
                type: { id: "4", shortName: "Streaming", slug: "streaming" },
                station: "ESPN+",
                media: { shortName: "ESPN+" },
              },
            ],
            status: { type: { state: "in", shortDetail: "Halftime" } },
          },
        ],
      },
    });
    expect(summary.streaming).toBe(true);
    expect(summary.streamNetwork).toBe("ESPN+");
  });

  it("leaves TV-only summaries without streaming info", () => {
    const summary = normalizeSummary({
      header: {
        competitions: [
          {
            broadcasts: [
              {
                market: "national",
                names: ["ESPN"],
                type: { id: "1", shortName: "TV", slug: "tv" },
                station: "ESPN",
                media: { shortName: "ESPN" },
              },
            ],
            status: { type: { state: "pre" } },
          },
        ],
      },
    });
    expect(summary.streaming).toBe(false);
    expect(summary.streamNetwork).toBeNull();
  });
});

describe("ESPN summary extras", () => {
  it("surfaces the boxscore team statistics and player lineups", () => {
    const summary = normalizeSummary({
      boxscore: {
        teams: [
          {
            team: { id: "8", displayName: "Detroit Pistons", abbreviation: "DET", logo: "det.png" },
            homeAway: "home",
            statistics: [
              { name: "fieldGoals", displayValue: "38-81", abbreviation: "FG", label: "FG" },
            ],
          },
          {
            team: {
              id: "20",
              displayName: "Philadelphia 76ers",
              abbreviation: "PHI",
              logos: [{ href: "phi.png" }],
            },
            homeAway: "away",
            statistics: [
              { name: "fieldGoals", displayValue: "35-78", abbreviation: "FG", label: "FG" },
            ],
          },
        ],
        players: [
          {
            team: { displayName: "Detroit Pistons", abbreviation: "DET" },
            statistics: [
              {
                names: ["MIN", "PTS"],
                labels: ["MIN", "PTS"],
                athletes: [
                  {
                    athlete: {
                      id: "1",
                      displayName: "Cade Cunningham",
                      shortName: "C. Cunningham",
                      headshot: { href: "cade.png" },
                      jersey: "2",
                      position: { abbreviation: "G" },
                    },
                    starter: true,
                    stats: ["24", "20"],
                  },
                  {
                    athlete: {
                      id: "2",
                      displayName: "Ausar Thompson",
                      shortName: "A. Thompson",
                      jersey: "9",
                      position: { abbreviation: "G" },
                    },
                    didNotPlay: true,
                    reason: "COACH'S DECISION",
                    stats: ["", ""],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(summary.boxscore.teams).toHaveLength(2);
    expect(summary.boxscore.teams[0].name).toBe("Detroit Pistons");
    expect(summary.boxscore.teams[0].stats[0]).toEqual({ label: "FG", abbr: "FG", value: "38-81" });
    expect(summary.boxscore.teams[1].logo).toBe("phi.png");

    const athletes = summary.boxscore.players[0].athletes;
    expect(athletes).toHaveLength(2);
    expect(athletes[0]).toMatchObject({
      name: "Cade Cunningham",
      starter: true,
      position: "G",
      groups: [{ group: null, stats: [{ label: "MIN", value: "24" }, { label: "PTS", value: "20" }] }],
    });
    expect(athletes[1]).toMatchObject({
      didNotPlay: true,
      reason: "COACH'S DECISION",
      groups: [{ stats: [] }],
    });
  });

  it("merges NFL athletes across the per-category stat groups", () => {
    const summary = normalizeSummary({
      boxscore: {
        players: [
          {
            team: { displayName: "Chicago Bears", abbreviation: "CHI" },
            statistics: [
              {
                name: "passing",
                labels: ["C/ATT", "YDS", "TD"],
                athletes: [
                  {
                    athlete: { id: "1", displayName: "Caleb Williams", jersey: "18" },
                    stats: ["24/34", "247", "1"],
                  },
                ],
              },
              {
                name: "rushing",
                labels: ["CAR", "YDS", "TD"],
                athletes: [
                  {
                    athlete: { id: "1", displayName: "Caleb Williams", jersey: "18" },
                    stats: ["4", "12", "0"],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const athletes = summary.boxscore.players[0].athletes;
    expect(athletes).toHaveLength(1);
    expect(athletes[0].groups).toEqual([
      {
        group: "passing",
        stats: [{ label: "C/ATT", value: "24/34" }, { label: "YDS", value: "247" }, { label: "TD", value: "1" }],
      },
      {
        group: "rushing",
        stats: [{ label: "CAR", value: "4" }, { label: "YDS", value: "12" }, { label: "TD", value: "0" }],
      },
    ]);
  });

  it("surfaces the game info, records, linescores and broadcasts from the header", () => {
    const summary = normalizeSummary({
      gameInfo: {
        venue: { fullName: "Little Caesars Arena", address: { city: "Detroit", state: "MI" } },
        attendance: 20432,
        officials: [{ displayName: "Marc Davis" }, { displayName: "Natalie Sago" }],
      },
      header: {
        competitions: [
          {
            date: "2026-11-05T00:00Z",
            broadcasts: [
              {
                market: { id: "1", type: "National" },
                type: { shortName: "TV" },
                media: { shortName: "ESPN" },
              },
            ],
            competitors: [
              {
                homeAway: "home",
                team: { abbreviation: "DET" },
                score: "120",
                record: [{ type: "total", summary: "6-1", displayValue: "6-1" }],
                linescores: [{ displayValue: "28" }, { displayValue: "32" }],
              },
              {
                homeAway: "away",
                team: { abbreviation: "PHI" },
                score: "115",
                record: [{ type: "total", summary: "7-1", displayValue: "7-1" }],
                linescores: [{ displayValue: "29" }, { displayValue: "27" }],
              },
            ],
          },
        ],
      },
    });

    expect(summary.venue).toBe("Little Caesars Arena");
    expect(summary.gameInfo).toEqual({
      venue: "Little Caesars Arena",
      city: "Detroit",
      attendance: 20432,
      officials: ["Marc Davis", "Natalie Sago"],
    });
    expect(summary.records).toEqual({ home: "6-1", away: "7-1" });
    expect(summary.linescores).toEqual({
      home: { code: "DET", periods: ["28", "32"] },
      away: { code: "PHI", periods: ["29", "27"] },
    });
    expect(summary.broadcasts).toEqual([
      { type: "TV", market: "National", station: "ESPN", isNational: true },
    ]);
    expect(summary.gameDate).toBe("2026-11-05T00:00Z");
  });

  it("surfaces the season series and league standings", () => {
    const summary = normalizeSummary({
      seasonseries: [
        {
          type: "season",
          title: "Regular Season Series",
          summary: "DET leads series 1-0",
          completed: false,
          totalCompetitions: 3,
          events: [
            {
              id: "401909866",
              date: "2026-10-25T23:30Z",
              status: { state: "post", completed: true },
              competitors: [
                {
                  homeAway: "home",
                  winner: true,
                  team: { abbreviation: "DET", displayName: "Detroit Pistons", logo: "det.png" },
                  score: "110",
                },
                {
                  homeAway: "away",
                  winner: false,
                  team: { abbreviation: "PHI", displayName: "Philadelphia 76ers", logo: "phi.png" },
                  score: "105",
                },
              ],
            },
          ],
        },
      ],
      standings: {
        header: "2026-27 Standings",
        fullViewLink: "https://www.espn.com/nba/standings",
        groups: [
          {
            header: "2026-27 Central Standings",
            conferenceHeader: "Eastern Conference",
            divisionHeader: "Central",
            href: "https://www.espn.com/nba/standings/_/group/2",
            standings: {
              entries: [
                {
                  team: "Detroit",
                  link: "https://www.espn.com/nba/team/_/name/det/detroit-pistons",
                  logo: [{ href: "det.png" }],
                  stats: [
                    { name: "gamesBehind", displayValue: "-" },
                    { name: "losses", displayValue: "1" },
                    { name: "streak", displayValue: "W3" },
                    { name: "winPercent", displayValue: ".857" },
                    { name: "wins", displayValue: "6" },
                  ],
                },
              ],
            },
          },
        ],
      },
    });

    const series = summary.seasonseries[0];
    expect(series.summary).toBe("DET leads series 1-0");
    expect(series.events[0].home).toMatchObject({
      name: "Detroit Pistons",
      score: "110",
      winner: true,
    });
    expect(series.events[0].away.code).toBe("PHI");

    expect(summary.standings.header).toBe("2026-27 Standings");
    const group = summary.standings.groups[0];
    expect(group.header).toBe("2026-27 Central Standings");
    expect(group.entries[0]).toMatchObject({
      name: "Detroit Pistons",
      slug: "detroit-pistons",
      code: "det",
      logo: "det.png",
    });
    expect(group.entries[0].stats).toEqual({
      gamesBehind: "-",
      losses: "1",
      streak: "W3",
      winPercent: ".857",
      wins: "6",
    });
  });

  it("leaves summary extras empty when the payload carries none", () => {
    const summary = normalizeSummary({});
    expect(summary.boxscore).toBeNull();
    expect(summary.gameInfo).toBeNull();
    expect(summary.records).toEqual({ home: null, away: null });
    expect(summary.linescores).toEqual({
      home: { code: null, periods: [] },
      away: { code: null, periods: [] },
    });
    expect(summary.seasonseries).toEqual([]);
    expect(summary.standings).toBeNull();
    expect(summary.broadcasts).toEqual([]);
    expect(summary.tickets).toBeNull();
  });
});

describe("ESPN request layer", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearEspnCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("builds direct + proxy candidate URLs", () => {
    const urls = scoreboardUrls("nfl", { week: 9, seasonType: 2 });
    expect(urls[0]).toContain("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard");
    expect(urls[0]).toContain("week=9");
    expect(urls[0]).toContain("seasontype=2");
    expect(urls).toContain("/espn/apis/site/v2/sports/football/nfl/scoreboard?limit=100&week=9&seasontype=2");
    expect(standingsUrls("nba")[0]).toContain("/apis/v2/sports/basketball/nba/standings");
  });

  it("falls back to the same-origin proxy and caches the payload", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ events: [] }) });
    global.fetch = fetchMock;

    const data = await requestEspn(["https://site.api.espn.com/fail", "/espn/fail"], { ttl: 1000 });
    expect(data).toEqual({ events: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await requestEspn(["https://site.api.espn.com/fail", "/espn/fail"], { ttl: 1000 });
    expect(fetchMock).toHaveBeenCalledTimes(2); // served from cache
  });

  it("surfaces an error when every endpoint fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(requestEspn(["https://site.api.espn.com/down"])).rejects.toThrow("Failed to fetch");
  });

  it("is disabled inside the test environment", () => {
    expect(isEspnDisabled()).toBe(true);
  });
});

describe("NCAA league routing", () => {
  it("merges the flagship boards and NCAA into the default view", () => {
    expect(liveLeaguesFor("basketball")).toEqual([
      "nba",
      "wnba",
      "nbl",
      "euroleague",
      "mens-college-basketball",
      "womens-college-basketball",
    ]);
    expect(liveLeaguesFor("football", "all")).toEqual(["nfl"]);
    // Soccer boards live in src/api/soccer.js (see soccer.test.js).
  });

  it("narrow the board to boards the default view does not already cover", () => {
    // NCAA basketball is merged into the default board, so selecting it needs no
    // extra fetch — the board filter focuses the view instead.
    expect(liveLeaguesFor("basketball", "ncaam")).toEqual([
      "nba",
      "wnba",
      "nbl",
      "euroleague",
      "mens-college-basketball",
      "womens-college-basketball",
    ]);
    expect(liveLeaguesFor("basketball", "ncaaw")).toEqual([
      "nba",
      "wnba",
      "nbl",
      "euroleague",
      "mens-college-basketball",
      "womens-college-basketball",
    ]);
    // College football is not in the default football board, so it is fetched on demand.
    expect(liveLeaguesFor("football", "cfb")).toEqual(["college-football"]);
  });

  it("maps competition ids to ESPN league keys", () => {
    expect(leagueKeyForCompetition("ncaam")).toBe("mens-college-basketball");
    expect(leagueKeyForCompetition("cfb")).toBe("college-football");
    expect(leagueKeyForCompetition("nfl")).toBe("nfl");
    // Soccer competitions are not mapped here — they live in src/api/soccer.js
    // and the soccer pages fall back to their own config.leagueKey.
    expect(leagueKeyForCompetition("eng.1")).toBeNull();
    expect(leagueKeyForCompetition("uefa.champions")).toBeNull();
    expect(leagueKeyForCompetition(undefined)).toBeNull();
  });
});

describe("live games across the local midnight", () => {
  const originalFetch = global.fetch;
  const today = toDateKey();
  const yesterday = shiftDateKey(today, -1);

  const espnGame = (id, { state = "in", home = "Boston Celtics", away = "New York Knicks" } = {}) => ({
    id,
    date: "2026-11-04T00:30:00Z",
    competitions: [
      {
        competitors: [
          { homeAway: "home", score: "84", team: { displayName: home, abbreviation: "BOS" } },
          { homeAway: "away", score: "79", team: { displayName: away, abbreviation: "NYK" } },
        ],
        venue: { fullName: "TD Garden" },
        status: { period: 3, displayClock: "4:32", type: { state, completed: state === "post" } },
      },
    ],
  });

  const respond = (payload) => Promise.resolve({ ok: true, json: async () => payload });

  beforeEach(() => {
    clearEspnCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("keeps last night's still-live game on the viewer's today", async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes(`dates=${today}`)) return respond({ events: [espnGame("today-live")] });
      if (String(url).includes(`dates=${yesterday}`)) {
        return respond({ events: [espnGame("carry-over"), espnGame("yesterday-final", { state: "post" })] });
      }
      return respond({ events: [] });
    });

    const snapshot = await fetchBasketballSnapshot({ date: today });
    const ids = snapshot.games.map((game) => game.id);

    expect(ids[0]).toBe("carry-over"); // leading, because it is what is live now
    expect(ids).toContain("today-live");
    expect(ids).not.toContain("yesterday-final");
  });

  it("does not ask for yesterday when another day is selected", async () => {
    global.fetch = vi.fn(() => respond({ events: [] }));

    await fetchBasketballSnapshot({ date: shiftDateKey(today, -3) });
    const urls = global.fetch.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes(`dates=${yesterday}`))).toBe(false);
  });

  it("does not list the same game twice", async () => {
    global.fetch = vi.fn(() => respond({ events: [espnGame("shared")] }));

    const snapshot = await fetchBasketballSnapshot({ date: today });
    expect(snapshot.games.filter((game) => game.id === "shared")).toHaveLength(1);
  });
});

