import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const basketballFetch = vi.fn();
const footballFetch = vi.fn();
const soccerFetch = vi.fn();
const loadLeaders = vi.fn();

vi.mock("../api/espn", async () => {
  const actual = await vi.importActual("../api/espn");
  return {
    ...actual,
    isEspnDisabled: () => false,
    loadLeaders: (...args) => loadLeaders(...args),
    SNAPSHOT_FETCHERS: {
      basketball: (...args) => basketballFetch(...args),
      football: (...args) => footballFetch(...args),
    },
  };
});

vi.mock("../api/soccer", () => ({
  fetchSoccerSnapshot: (...args) => soccerFetch(...args),
}));

const { useEspnFeed, REFRESH_INTERVAL } = await import("./useEspnFeed");
const { basketballGames, soccerGames } = await import("../data/sportsData");

const liveGame = {
  id: "401",
  competitionId: "nba",
  competition: "NBA",
  country: "United States",
  status: "LIVE",
  clock: "Q3 · 04:32",
  home: "Boston Celtics",
  away: "New York Knicks",
  homeCode: "BOS",
  awayCode: "NYK",
  homeScore: 84,
  awayScore: 79,
  venue: "TD Garden",
};

const liveStandings = [
  {
    group: "NBA · Eastern Conference",
    rows: [{ team: "Boston Celtics", code: "BOS", p: 82, w: 61, l: 21, pct: ".744", gb: "—", streak: "W4" }],
  },
];

beforeEach(() => {
  basketballFetch.mockReset();
  footballFetch.mockReset();
  soccerFetch.mockReset();
  loadLeaders.mockReset();
  loadLeaders.mockResolvedValue([]);
});

describe("useEspnFeed", () => {
  it("starts on demo data and swaps in the ESPN payload", async () => {
    basketballFetch.mockResolvedValue({ games: [liveGame], standings: liveStandings, meta: {} });

    const { result } = renderHook(() => useEspnFeed({ sport: "basketball" }));

    expect(result.current.games).toHaveLength(basketballGames.length);
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("live"));

    expect(result.current.games).toEqual([liveGame]);
    expect(result.current.standings).toEqual(liveStandings);
    expect(result.current.source).toBe("espn");
    expect(result.current.badge).toBe("LIVE · ESPN");
    expect(result.current.label).toContain("ESPN live");
    expect(result.current.stats.find((stat) => stat.label === "Games today").value).toBe("01");
  });

  it("keeps demo data and reports offline when ESPN fails", async () => {
    basketballFetch.mockRejectedValue(new Error("ESPN scoreboards are unreachable"));

    const { result } = renderHook(() => useEspnFeed({ sport: "basketball" }));

    await waitFor(() => expect(result.current.status).toBe("offline"));

    expect(result.current.games).toHaveLength(basketballGames.length);
    expect(result.current.source).toBe("demo");
    expect(result.current.badge).toBe("OFFLINE · DEMO");
    expect(result.current.label).toBe("ESPN unavailable · demo data");
    expect(result.current.error).toContain("unreachable");
  });

  it("forces a fresh request on refresh and uses live leaders when available", async () => {
    basketballFetch.mockResolvedValue({ games: [liveGame], standings: liveStandings, meta: {} });
    loadLeaders.mockResolvedValue([
      { name: "Luka Dončić", team: "Dallas Mavericks", metric: "Points Per Game", value: "33.9", initials: "LD" },
    ]);

    const { result } = renderHook(() => useEspnFeed({ sport: "basketball" }));
    await waitFor(() => expect(result.current.status).toBe("live"));
    await waitFor(() => expect(result.current.leaders[0].name).toBe("Luka Dončić"));

    expect(basketballFetch).toHaveBeenCalledTimes(1);
    expect(basketballFetch.mock.calls[0][0].force).toBe(false);

    act(() => result.current.refresh());

    await waitFor(() => expect(basketballFetch).toHaveBeenCalledTimes(2));
    expect(basketballFetch.mock.calls[1][0].force).toBe(true);
  });

  it("passes the selected season through to the ESPN fetcher", async () => {
    basketballFetch.mockResolvedValue({ games: [liveGame], standings: liveStandings, meta: {} });

    const { result } = renderHook(() => useEspnFeed({ sport: "basketball", season: 2025 }));

    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(basketballFetch.mock.calls[0][0].season).toBe(2025);
  });

  it("never hits the network when disabled", () => {
    const { result } = renderHook(() => useEspnFeed({ sport: "basketball", enabled: false }));

    expect(basketballFetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe("demo");
    expect(result.current.badge).toBe("DEMO DATA");
    expect(result.current.games).toHaveLength(basketballGames.length);
  });

  it("derives the week snapshot for football from the games", async () => {
    const liveNfl = { ...liveGame, id: "501", competitionId: "nfl", competition: "NFL" };
    const upcomingNfl = {
      ...liveGame,
      id: "502",
      competitionId: "nfl",
      competition: "NFL",
      status: "UPCOMING",
      clock: "",
      homeScore: null,
      awayScore: null,
    };
    footballFetch.mockResolvedValue({
      games: [liveNfl, upcomingNfl],
      standings: null,
      meta: { week: 9 },
    });

    const { result } = renderHook(() => useEspnFeed({ sport: "football" }));

    await waitFor(() => expect(result.current.status).toBe("live"));

    const stat = (label) => result.current.stats.find((entry) => entry.label === label)?.value;
    expect(stat("Games this week")).toBe("02");
    expect(stat("Live games")).toBe("01");
    expect(stat("Upcoming")).toBe("01");
    expect(stat("Final")).toBe("00");
  });

  it("serves the football (soccer) board from the soccer feed", async () => {
    const liveSoccer = {
      ...liveGame,
      id: "401878758",
      competitionId: "eng.1",
      competition: "Premier League",
      country: "United Kingdom",
      home: "Leeds United",
      away: "Tottenham Hotspur",
      homeCode: "LEE",
      awayCode: "TOT",
    };
    soccerFetch.mockResolvedValue({
      games: [liveSoccer],
      standings: [
        {
          group: "2026-27 English Premier League",
          rows: [{ team: "Arsenal", code: "ARS", p: 10, w: 9, l: 0, t: 1, pct: "2.70", pts: 27 }],
        },
      ],
      meta: { seasonYear: 2026 },
    });

    const { result } = renderHook(() => useEspnFeed({ sport: "soccer", date: "20261107" }));

    expect(result.current.games).toHaveLength(soccerGames.length); // soccer demo board
    await waitFor(() => expect(result.current.status).toBe("live"));

    expect(result.current.games).toEqual([liveSoccer]);
    expect(result.current.standings[0].rows[0].pts).toBe(27);
    expect(result.current.stats.find((stat) => stat.label === "Matches today").value).toBe("01");
    // Soccer has no ESPN leaders feed — the bundled top scorers stay.
    expect(loadLeaders).not.toHaveBeenCalled();
  });

  it("exposes a 45 second refresh interval", () => {
    expect(REFRESH_INTERVAL).toBe(45000);
  });
});
