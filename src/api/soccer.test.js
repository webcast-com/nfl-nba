import { describe, expect, it } from "vitest";
import {
  normalizeScoreboard,
  normalizeStandings,
} from "./espn";
import {
  SOCCER_LEAGUES,
  SOCCER_LIVE_LEAGUES,
  liveLeaguesForSoccer,
} from "./soccer";

describe("soccer league registry", () => {
  it("keeps the tracked competitions on the soccer sport path", () => {
    expect(SOCCER_LIVE_LEAGUES).toEqual([
      "eng.1",
      "esp.1",
      "ita.1",
      "ger.1",
      "uefa.champions",
    ]);
    for (const [key, league] of Object.entries(SOCCER_LEAGUES)) {
      expect(league.sport).toBe("soccer");
      expect(league.path).toBe(`soccer/${key}`);
      expect(league.competitionId).toBe(key);
    }
  });

  it("narrows the board to a single competition", () => {
    expect(liveLeaguesForSoccer()).toEqual(SOCCER_LIVE_LEAGUES);
    expect(liveLeaguesForSoccer("all")).toEqual(SOCCER_LIVE_LEAGUES);
    expect(liveLeaguesForSoccer("eng.1")).toEqual(["eng.1"]);
    expect(liveLeaguesForSoccer("esp.1")).toEqual(["esp.1"]);
  });
});

describe("football (soccer) feeds", () => {
  const soccerScoreboard = {
    events: [
      {
        id: "401878758",
        date: "2026-11-07T12:30:00Z",
        competitions: [
          {
            competitors: [
              {
                homeAway: "home",
                score: "1",
                winner: true,
                team: { displayName: "Leeds United", abbreviation: "LEE", id: "357" },
              },
              {
                homeAway: "away",
                score: "0",
                team: { displayName: "Tottenham Hotspur", abbreviation: "TOT", id: "367" },
              },
            ],
            venue: { fullName: "Elland Road", address: { country: "England" } },
            geoBroadcasts: [
              {
                type: { id: "4", shortName: "STREAMING" },
                market: { id: "1", type: "National" },
                media: { shortName: "USA Network" },
              },
            ],
            status: {
              period: 2,
              displayClock: "90'+5'",
              type: { state: "post", completed: true, description: "Full Time" },
            },
          },
        ],
      },
      {
        id: "401900001",
        date: "2026-11-07T20:00:00Z",
        competitions: [
          {
            competitors: [
              {
                homeAway: "home",
                score: "1",
                team: { displayName: "Arsenal", abbreviation: "ARS", id: "359" },
              },
              {
                homeAway: "away",
                score: "1",
                team: { displayName: "Manchester City", abbreviation: "MNC", id: "382" },
              },
            ],
            venue: { fullName: "Emirates Stadium", address: { country: "England" } },
            status: {
              period: 2,
              displayClock: "63'",
              type: { state: "in", completed: false, description: "Live" },
            },
          },
        ],
      },
    ],
  };

  it("normalises soccer scoreboards onto the hub game shape", () => {
    const games = normalizeScoreboard(soccerScoreboard, { league: "eng.1" });

    expect(games).toHaveLength(2);
    const final = games[0];
    expect(final.competitionId).toBe("eng.1");
    expect(final.competition).toBe("Premier League");
    expect(final.country).toBe("United Kingdom"); // "England" maps to the UK
    expect(final.status).toBe("FINAL");
    expect(final.clock).toBe("Final");
    expect(final.home).toBe("Leeds United");
    expect(final.homeScore).toBe(1);
    expect(final.awayScore).toBe(0);

    const live = games[1];
    expect(live.status).toBe("LIVE");
    // Half-time labels instead of basketball quarters.
    expect(live.clock).toBe("2nd Half · 63'");
  });

  it("marks streaming broadcasts as match metadata", () => {
    const games = normalizeScoreboard(soccerScoreboard, { league: "eng.1" });
    expect(games[0].streaming).toBe(true);
    expect(games[0].streamNetwork).toBe("USA Network");
    expect(games[0].watchUrl).toBeUndefined();
    expect(games[1].streaming).toBe(false);
  });

  it("ranks soccer standings by points with a PPG percentage", () => {
    const payload = {
      children: [
        {
          name: "2026-27 English Premier League",
          standings: {
            entries: [
              {
                team: { displayName: "Manchester City", abbreviation: "MNC", id: "382" },
                stats: [
                  { name: "gamesPlayed", value: 9 },
                  { name: "wins", value: 7 },
                  { name: "losses", value: 1 },
                  { name: "ties", value: 1 },
                  { name: "points", value: 22 },
                  { name: "pointsFor", value: 20 },
                  { name: "pointsAgainst", value: 10 },
                ],
              },
              {
                team: { displayName: "Arsenal", abbreviation: "ARS", id: "359" },
                stats: [
                  { name: "gamesPlayed", value: 10 },
                  { name: "wins", value: 9 },
                  { name: "losses", value: 0 },
                  { name: "ties", value: 1 },
                  { name: "points", value: 27 },
                  { name: "pointsFor", value: 15 },
                  { name: "pointsAgainst", value: 5 },
                ],
              },
            ],
          },
        },
      ],
    };

    const groups = normalizeStandings(payload, { sport: "soccer" });
    expect(groups).toHaveLength(1);
    expect(groups[0].group).toBe("2026-27 English Premier League");
    expect(groups[0].rows[0].team).toBe("Arsenal"); // sorted by points, not wins%
    expect(groups[0].rows[0].pts).toBe(27);
    expect(groups[0].rows[0].pct).toBe("2.70"); // points per game
    expect(groups[0].rows[1].pts).toBe(22);
    expect(groups[0].rows[1].pf).toBe(20);
    expect(groups[0].rows[1].pa).toBe(10);
  });
});
