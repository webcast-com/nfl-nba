import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MatchPage from "./MatchPage";
import { loadMatchSummary } from "../api/espn";

vi.mock("../api/espn", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isEspnDisabled: () => false,
    loadMatchSummary: vi.fn(),
  };
});

beforeEach(() => {
  loadMatchSummary.mockReset();
  loadMatchSummary.mockResolvedValue({ plays: [], teams: [], venue: null, state: null });
});

afterEach(cleanup);

const renderAt = (path, sport = "basketball") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/basketball/match/:matchId" element={<MatchPage sport={sport} />} />
        <Route path="/nfl/match/:matchId" element={<MatchPage sport={sport} />} />
      </Routes>
    </MemoryRouter>
  );

const heroText = (container) => container.querySelector(".sh-match-hero")?.textContent ?? "";

describe("commentary page", () => {
  it("renders a demo game from bundled data while ESPN loads behind it", () => {
    const { container } = renderAt("/basketball/match/1");
    expect(heroText(container)).toContain("Boston Celtics");
    expect(heroText(container)).toContain("84");
    expect(container.querySelector(".sh-commentary li")).toBeTruthy();
    expect(loadMatchSummary).toHaveBeenCalledWith("nba", "1");
  });

  it("styles a finished demo game as final, not upcoming", () => {
    const { container } = renderAt("/basketball/match/4");
    const chip = container.querySelector(".sh-detail-chip");
    expect(chip.textContent).toBe("Final");
    expect(chip.className).toContain("is-final");
  });

  it("keeps a scheduled game's commentary panel instead of an error", () => {
    const { container } = renderAt("/basketball/match/8");
    expect(heroText(container)).toContain("UConn Huskies");
    expect(container.textContent).toContain("Commentary starts at");
    expect(container.textContent).not.toContain("We couldn't find that match");
  });

  it("asks the competition's feed for a college game", () => {
    renderAt("/basketball/match/7?competition=ncaam");
    expect(loadMatchSummary).toHaveBeenCalledWith(
      "mens-college-basketball",
      "7"
    );
  });

  it("shows the hero from ESPN even when the summary has no plays", async () => {
    loadMatchSummary.mockResolvedValue({
      plays: [],
      state: "in",
      statusText: "2nd · 4:11",
      venue: "Cameron Indoor Stadium",
      teams: [
        { name: "Duke Blue Devils", abbreviation: "DUKE", homeAway: "home", score: "68", logo: null },
        {
          name: "North Carolina Tar Heels",
          abbreviation: "UNC",
          homeAway: "away",
          score: "65",
          logo: null,
        },
      ],
    });

    const { container } = renderAt("/basketball/match/401777999");

    await waitFor(() => expect(heroText(container)).toContain("Duke Blue Devils"));
    expect(heroText(container)).toContain("North Carolina Tar Heels");
    expect(container.textContent).toContain("Cameron Indoor Stadium");
    expect(container.querySelector(".sh-detail-chip").className).toContain("is-live");
    expect(container.textContent).toContain("has not published play-by-play");
    expect(container.textContent).not.toContain("We couldn't find that match");
  });

  it("renders a Watch link when the ESPN summary reports a streaming broadcast", async () => {
    loadMatchSummary.mockResolvedValue({
      plays: [],
      state: "in",
      statusText: "2nd · 4:11",
      venue: "Cameron Indoor Stadium",
      streaming: true,
      streamNetwork: "ESPN+",
      teams: [
        { name: "Duke Blue Devils", abbreviation: "DUKE", homeAway: "home", score: "68", logo: null },
        {
          name: "North Carolina Tar Heels",
          abbreviation: "UNC",
          homeAway: "away",
          score: "65",
          logo: null,
        },
      ],
    });

    renderAt("/basketball/match/401777999");

    const watch = await screen.findByText("Watch");
    const link = watch.closest("a");
    expect(link.getAttribute("href")).toBe(
      "https://www.espn.com/watch/basketball/nba/game/_/gameId/401777999"
    );
    expect(link.getAttribute("title")).toBe("Watch on ESPN+");
  });

  it("omits the Watch link for TV-only summaries", async () => {
    loadMatchSummary.mockResolvedValue({
      plays: [],
      state: "pre",
      statusText: "7:30 PM",
      venue: "Madison Square Garden",
      streaming: false,
      teams: [
        { name: "Boston Celtics", abbreviation: "BOS", homeAway: "home", score: null, logo: null },
        { name: "New York Knicks", abbreviation: "NYK", homeAway: "away", score: null, logo: null },
      ],
    });

    const { container } = renderAt("/basketball/match/401888889");

    await waitFor(() => expect(heroText(container)).toContain("Madison Square Garden"));
    expect(container.querySelector(".sh-watch-btn")).toBeNull();
  });

  it("renders ESPN plays with their clock, team and score", async () => {
    loadMatchSummary.mockResolvedValue({
      plays: [
        { clock: "Q1 08:12", team: "BOS", text: "Jayson Tatum hits a three.", score: "83-79" },
        { clock: "Q1 07:40", team: "NYK", text: "Jalen Brunson answers.", score: "83-81" },
      ],
      state: "post",
      statusText: "Final",
      venue: "TD Garden",
      teams: [
        { name: "Boston Celtics", abbreviation: "BOS", homeAway: "home", score: "84" },
        { name: "New York Knicks", abbreviation: "NYK", homeAway: "away", score: "81" },
      ],
    });

    const { container } = renderAt("/basketball/match/401888888");

    await waitFor(() => expect(container.querySelectorAll(".sh-commentary li")).toHaveLength(2));
    const first = container.querySelector(".sh-commentary li");
    expect(first.textContent).toContain("Q1 08:12");
    expect(first.textContent).toContain("Jayson Tatum hits a three.");
    expect(first.textContent).toContain("83-79");
    expect(container.querySelector(".sh-detail-chip").className).toContain("is-final");
    expect(container.textContent).toContain("ESPN play-by-play");
  });

  it("does not flash the missing-match state while the feed is in flight", () => {
    let resolve;
    loadMatchSummary.mockReturnValue(new Promise((done) => (resolve = done)));

    const { container } = renderAt("/nfl/match/401999999", "football");

    expect(container.textContent).toContain("Loading the play-by-play");
    expect(container.textContent).not.toContain("We couldn't find that match");
    resolve({ plays: [], teams: [], venue: null, state: null });
  });

  it("still reports a genuinely unknown match once ESPN has answered", async () => {
    renderAt("/basketball/match/999999");
    await screen.findByText("We couldn't find that match");
  });
});

describe("match section chips", () => {
  const fullSummary = () => ({
    plays: [],
    state: "post",
    statusText: "Final",
    venue: "Little Caesars Arena",
    teams: [
      { name: "Detroit Pistons", abbreviation: "DET", homeAway: "home", score: "120", logo: null },
      { name: "Philadelphia 76ers", abbreviation: "PHI", homeAway: "away", score: "115", logo: null },
    ],
    gameInfo: {
      venue: "Little Caesars Arena",
      city: "Detroit",
      attendance: 20432,
      officials: ["Marc Davis", "Natalie Sago"],
    },
    records: { home: "6-1", away: "7-1" },
    linescores: {
      home: { code: "DET", periods: ["28", "32", "30", "30"] },
      away: { code: "PHI", periods: ["29", "27", "30", "29"] },
    },
    broadcasts: [{ type: "TV", market: "National", station: "ESPN", isNational: true }],
    seasonseries: [
      {
        type: "season",
        title: "Regular Season Series",
        summary: "DET leads series 1-0",
        events: [
          {
            id: "401909866",
            date: "2026-10-25T23:30Z",
            state: "post",
            completed: true,
            home: { name: "Detroit Pistons", code: "DET", logo: null, score: "110", winner: true },
            away: { name: "Philadelphia 76ers", code: "PHI", logo: null, score: "105", winner: false },
          },
        ],
      },
    ],
    standings: {
      header: "2026-27 Standings",
      groups: [
        {
          header: "2026-27 Central Standings",
          conferenceHeader: "Eastern Conference",
          entries: [
            {
              name: "Detroit Pistons",
              slug: "detroit-pistons",
              code: "det",
              logo: null,
              stats: { wins: "6", losses: "1", winPercent: ".857", gamesBehind: "-", streak: "W3" },
            },
            {
              name: "Cleveland Cavaliers",
              slug: "cleveland-cavaliers",
              code: "cle",
              logo: null,
              stats: { wins: "4", losses: "3", winPercent: ".571", gamesBehind: "2", streak: "L1" },
            },
          ],
        },
      ],
    },
    boxscore: {
      teams: [
        {
          name: "Detroit Pistons",
          code: "DET",
          logo: null,
          homeAway: "home",
          stats: [
            { label: "FG", abbr: "FG", value: "38-81" },
            { label: "REB", abbr: "REB", value: "48" },
          ],
        },
        {
          name: "Philadelphia 76ers",
          code: "PHI",
          logo: null,
          homeAway: "away",
          stats: [
            { label: "FG", abbr: "FG", value: "35-78" },
            { label: "REB", abbr: "REB", value: "44" },
          ],
        },
      ],
      players: [
        {
          team: "Detroit Pistons",
          code: "DET",
          athletes: [
            {
              id: "1",
              name: "Cade Cunningham",
              shortName: "C. Cunningham",
              headshot: null,
              jersey: "2",
              position: "G",
              starter: true,
              didNotPlay: false,
              reason: null,
              groups: [{ group: null, stats: [{ label: "PTS", value: "20" }, { label: "REB", value: "6" }] }],
            },
            {
              id: "2",
              name: "Ausar Thompson",
              shortName: "A. Thompson",
              headshot: null,
              jersey: "9",
              position: "G",
              starter: false,
              didNotPlay: true,
              reason: "COACH'S DECISION",
              groups: [{ group: null, stats: [] }],
            },
          ],
        },
        {
          team: "Philadelphia 76ers",
          code: "PHI",
          athletes: [
            {
              id: "3",
              name: "Paul George",
              shortName: "P. George",
              headshot: null,
              jersey: "1",
              position: "F",
              starter: true,
              didNotPlay: false,
              reason: null,
              groups: [{ group: null, stats: [{ label: "PTS", value: "24" }] }],
            },
          ],
        },
      ],
    },
  });

  const openAt = async (container, label) => {
    await waitFor(() => expect(heroText(container)).toContain("Detroit Pistons"));
    fireEvent.click(screen.getByRole("tab", { name: label }));
  };

  it("renders the six section chips under the hero", async () => {
    loadMatchSummary.mockResolvedValue(fullSummary());
    const { container } = renderAt("/basketball/match/401909922");
    await openAt(container, /Commentary/);
    const chips = container.querySelectorAll(".sh-match-chip");
    expect([...chips].map((chip) => chip.textContent)).toEqual([
      "Commentary",
      "Match Details",
      "Stats",
      "Lineups",
      "Head to Head",
      "League Table",
    ]);
  });

  it("switches to the match details panel with venue, records and linescore", async () => {
    loadMatchSummary.mockResolvedValue(fullSummary());
    const { container } = renderAt("/basketball/match/401909922");
    await openAt(container, /Match Details/);
    expect(container.textContent).toContain("Little Caesars Arena, Detroit");
    expect(container.textContent).toContain("20,432");
    expect(container.textContent).toContain("Marc Davis");
    expect(container.textContent).toContain("DET leads series 1-0");
    expect(container.textContent).toContain("ESPN · National");
    const linescore = container.querySelector(".sh-linescore");
    expect(linescore).toBeTruthy();
    expect(linescore.textContent).toContain("DET");
    expect(linescore.textContent).toContain("120");
    expect(container.querySelector(".sh-commentary")).toBeNull();
  });

  it("switches to the stats panel and lists both teams' numbers", async () => {
    loadMatchSummary.mockResolvedValue(fullSummary());
    const { container } = renderAt("/basketball/match/401909922");
    await openAt(container, /^Stats/);
    expect(container.textContent).toContain("Team Statistics");
    expect(container.textContent).toContain("38-81");
    expect(container.textContent).toContain("35-78");
    expect(container.textContent).toContain("48");
    expect(container.textContent).toContain("44");
  });

  it("switches to the lineups panel and marks starters and DNP players", async () => {
    loadMatchSummary.mockResolvedValue(fullSummary());
    const { container } = renderAt("/basketball/match/401909922");
    await openAt(container, /Lineups/);
    expect(container.textContent).toContain("Cade Cunningham");
    expect(container.textContent).toContain("Starter");
    expect(container.textContent).toContain("Ausar Thompson");
    expect(container.textContent).toContain("DNP");
    expect(container.textContent).toContain("COACH'S DECISION");
    expect(container.textContent).toContain("Paul George");
    // Starters are listed before bench players.
    const names = [...container.querySelectorAll(".sh-lineup-meta b")].map((node) => node.textContent);
    expect(names).toEqual(["Cade Cunningham", "Ausar Thompson", "Paul George"]);
  });

  it("switches to the head-to-head panel and lists past meetings", async () => {
    loadMatchSummary.mockResolvedValue(fullSummary());
    const { container } = renderAt("/basketball/match/401909922");
    await openAt(container, /Head to Head/);
    expect(container.textContent).toContain("Regular Season Series");
    expect(container.textContent).toContain("DET leads series 1-0");
    const events = container.querySelectorAll(".sh-h2h-events li");
    expect(events).toHaveLength(1);
    expect(events[0].textContent).toContain("Detroit Pistons");
    expect(events[0].textContent).toContain("110");
    expect(events[0].textContent).toContain("105");
    expect(events[0].textContent).toContain("Final");
  });

  it("switches to the league table panel and links teams to their pages", async () => {
    loadMatchSummary.mockResolvedValue(fullSummary());
    const { container } = renderAt("/basketball/match/401909922");
    await openAt(container, /League Table/);
    expect(container.textContent).toContain("2026-27 Central Standings");
    expect(container.textContent).toContain("Eastern Conference");
    expect(container.textContent).toContain(".857");
    expect(container.textContent).toContain("W3");
    const link = container.querySelector(".sh-team-link");
    expect(link.getAttribute("href")).toBe("/basketball/team/detroit-pistons");
    expect(link.textContent).toBe("Detroit Pistons");
  });

  it("returns to commentary from any chip", async () => {
    loadMatchSummary.mockResolvedValue(fullSummary());
    const { container } = renderAt("/basketball/match/401909922");
    await openAt(container, /^Stats/);
    expect(container.querySelector(".sh-commentary")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /^Commentary/ }));
    expect(container.textContent).toContain("Commentary");
  });

  it("shows empty states for sections without ESPN data on a demo game", async () => {
    const { container } = renderAt("/basketball/match/1");
    fireEvent.click(screen.getByRole("tab", { name: /Lineups/ }));
    expect(container.textContent).toContain("Lineups aren't posted yet");
    fireEvent.click(screen.getByRole("tab", { name: /League Table/ }));
    expect(container.textContent).toContain("League table isn't available yet");
  });

  it("adapts the league table columns to the NFL board", async () => {
    loadMatchSummary.mockResolvedValue({
      ...fullSummary(),
      standings: {
        header: "2026 Standings",
        groups: [
          {
            header: "2026 AFC South Standings",
            conferenceHeader: "American Football Conference",
            entries: [
              {
                name: "Jacksonville Jaguars",
                slug: "jacksonville-jaguars",
                code: "jax",
                logo: null,
                stats: {
                  overall: "5-2",
                  wins: "5",
                  losses: "2",
                  winPercent: ".714",
                  pointsFor: "196",
                  pointsAgainst: "111",
                },
              },
            ],
          },
        ],
      },
    });
    const { container } = renderAt("/nfl/match/401873037", "football");
    await openAt(container, /League Table/);
    const table = container.querySelector(".sh-league-table");
    expect([...table.querySelectorAll("thead th")].map((th) => th.textContent)).toEqual([
      "Team",
      "W-L",
      "PCT",
      "PF",
      "PA",
    ]);
    expect(table.textContent).toContain("5-2");
    expect(table.textContent).toContain("196");
  });
});
