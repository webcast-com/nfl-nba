import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import SportsrcPanel from "./SportsrcPanel";

afterEach(cleanup);

const liveMatch = {
  id: "a",
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
  homeLogo: null,
  awayLogo: null,
  broadcast: null,
};

const upcomingMatch = {
  id: "b",
  competitionId: "liga-revelacao-u23",
  competition: "Liga Revelação U23",
  country: "Portugal",
  status: "UPCOMING",
  clock: "Today · 20:00",
  home: "União Leiria U23",
  away: "Estoril U23",
  homeCode: "UNI",
  awayCode: "EST",
  homeScore: null,
  awayScore: null,
  homeLogo: null,
  awayLogo: null,
  broadcast: null,
};

const feed = {
  matches: [liveMatch, upcomingMatch],
  status: "live",
  badge: "LIVE · SPORTSRC",
  refreshing: false,
  refresh: () => {},
  label: "Sportsrc live",
};

describe("SportsrcPanel", () => {
  it("renders the fixtures and the source chip", () => {
    const { getByText, queryByText } = render(<SportsrcPanel feed={feed} />);

    expect(getByText("Global basketball · Sportsrc")).toBeTruthy();
    expect(getByText("2 fixtures")).toBeTruthy();
    expect(getByText("LIVE · SPORTSRC")).toBeTruthy();
    expect(getByText("Real Madrid")).toBeTruthy();
    expect(getByText("União Leiria U23")).toBeTruthy();
    expect(getByText("Final")).toBeTruthy();
    expect(queryByText("Showing the first")).toBeNull();
  });

  it("filters by status tab", () => {
    const { getByRole, queryByText } = render(<SportsrcPanel feed={feed} />);

    fireEvent.click(getByRole("tab", { name: "UPCOMING" }));
    expect(queryByText("Real Madrid")).toBeNull();
    expect(queryByText("Estoril U23")).toBeTruthy();
  });

  it("shows an offline note when the feed comes back empty", () => {
    const { getByText } = render(
      <SportsrcPanel feed={{ matches: [], status: "offline", badge: "OFFLINE · SPORTSRC", error: "Sportsrc 500" }} />
    );

    expect(getByText("No fixtures from Sportsrc")).toBeTruthy();
    expect(getByText("Sportsrc 500")).toBeTruthy();
  });
});
