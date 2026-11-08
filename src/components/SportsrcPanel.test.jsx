import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import SportsrcPanel from "./SportsrcPanel";

vi.mock("../api/sportsrc", () => ({
  loadMatchDetail: vi.fn(),
}));

import { loadMatchDetail } from "../api/sportsrc";

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

const detailPayload = {
  id: "a",
  competition: "EuroLeague",
  country: "Europe",
  status: "FINAL",
  statusDetail: "Ended",
  home: "Real Madrid",
  away: "Olympiacos",
  homeCode: "RMA",
  awayCode: "OLY",
  homeScore: 92,
  awayScore: 88,
  venue: "WiZink Center",
  referee: "Mateu Lahoz",
  sources: [
    {
      id: "stream-1",
      source: "lola",
      embedUrl: "https://football77.org/embed/?id=a&source=lola",
      hd: true,
    },
    {
      id: "stream-2",
      source: "STV",
      embedUrl: "https://football77.org/embed/?id=a&source=STV",
      hd: true,
    },
  ],
};

describe("SportsrcPanel", () => {
  it("renders the fixtures and the source chip", () => {
    const { getByText, queryByText } = render(<SportsrcPanel feed={feed} />);

    expect(getByText("Football · Sportsrc")).toBeTruthy();
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

describe("SportsrcPanel livestream", () => {
  beforeEach(() => {
    loadMatchDetail.mockReset();
  });

  it("shows a Watch button on every fixture", () => {
    const { getAllByRole } = render(<SportsrcPanel feed={feed} />);
    expect(getAllByRole("button", { name: /watch/i })).toHaveLength(2);
  });

  it("opens the livestream dialog and renders the embed iframe", async () => {
    loadMatchDetail.mockResolvedValue(detailPayload);
    const { getByRole, findByRole, getByTitle } = render(<SportsrcPanel feed={feed} />);

    fireEvent.click(getByRole("button", { name: /watch real madrid v olympiacos livestream/i }));
    const dialog = await findByRole("dialog");
    expect(dialog).toBeTruthy();

    const frame = getByTitle("Real Madrid v Olympiacos livestream");
    expect(frame.getAttribute("src")).toBe("https://football77.org/embed/?id=a&source=lola");
    expect(frame.getAttribute("allow")).toContain("fullscreen");
    expect(frame.getAttribute("allowfullscreen")).not.toBeNull();
  });

  it("switches between the available stream sources", async () => {
    loadMatchDetail.mockResolvedValue(detailPayload);
    const { getByRole, findByRole, getByTitle } = render(<SportsrcPanel feed={feed} />);

    fireEvent.click(getByRole("button", { name: /watch real madrid v olympiacos livestream/i }));
    await findByRole("dialog");

    fireEvent.click(getByRole("tab", { name: /STV/ }));
    expect(getByTitle("Real Madrid v Olympiacos livestream").getAttribute("src")).toBe(
      "https://football77.org/embed/?id=a&source=STV"
    );
  });

  it("closes the livestream again", async () => {
    loadMatchDetail.mockResolvedValue(detailPayload);
    const { getByRole, findByRole, queryByRole } = render(<SportsrcPanel feed={feed} />);

    fireEvent.click(getByRole("button", { name: /watch real madrid v olympiacos livestream/i }));
    await findByRole("dialog");

    fireEvent.click(getByRole("button", { name: "Close livestream" }));
    expect(queryByRole("dialog")).toBeNull();
  });

  it("surfaces an error when the stream detail cannot be fetched", async () => {
    loadMatchDetail.mockRejectedValue(new Error("Sportsrc 502"));
    const { getByRole, findByRole, findByText } = render(<SportsrcPanel feed={feed} />);

    fireEvent.click(getByRole("button", { name: /watch real madrid v olympiacos livestream/i }));
    await findByRole("dialog");
    expect(await findByText("Sportsrc 502")).toBeTruthy();
  });

  it("shows a note when the match has no stream sources", async () => {
    loadMatchDetail.mockResolvedValue({ ...detailPayload, sources: [] });
    const { getByRole, findByRole, findByText } = render(<SportsrcPanel feed={feed} />);

    fireEvent.click(getByRole("button", { name: /watch real madrid v olympiacos livestream/i }));
    await findByRole("dialog");
    expect(await findByText("No stream sources available for this match right now.")).toBeTruthy();
  });
});
