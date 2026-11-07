import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { HERO_TICKER_MS } from "../components/Scoreboard";
import StreamLivePage from "./StreamLivePage";

const loadMatches = vi.fn();
const loadMatchDetail = vi.fn();

vi.mock("../api/sportsrc", async () => {
  const actual = await vi.importActual("../api/sportsrc");
  return {
    ...actual,
    isSportsrcDisabled: () => false,
    hasSportsrcKey: () => true,
    loadMatches: (...args) => loadMatches(...args),
    loadMatchDetail: (...args) => loadMatchDetail(...args),
  };
});

const sportsrcLive = {
  id: "liga-live-1",
  competitionId: "liga-revelacao-u23",
  competition: "Liga Revelação U23",
  country: "Portugal",
  status: "LIVE",
  clock: "2nd quarter",
  home: "União Leiria U23",
  away: "Estoril U23",
  homeCode: "UNI",
  awayCode: "EST",
  homeScore: 44,
  awayScore: 41,
  venue: "Venue TBD",
};

const sportsrcUpcoming = {
  id: "liga-upcoming-1",
  competitionId: "liga-revelacao-u23",
  competition: "Liga Revelação U23",
  country: "Portugal",
  status: "UPCOMING",
  clock: "Today · 20:00",
  home: "Benfica U23",
  away: "Porto U23",
  homeCode: "BEN",
  awayCode: "POR",
  homeScore: null,
  awayScore: null,
  venue: "Venue TBD",
};

const sportsrcDetail = {
  id: "liga-live-1",
  competition: "Liga Revelação U23",
  country: "Portugal",
  status: "LIVE",
  statusDetail: "2nd quarter",
  home: "União Leiria U23",
  away: "Estoril U23",
  homeCode: "UNI",
  awayCode: "EST",
  homeScore: 44,
  awayScore: 41,
  venue: "Pavilhão João Rocha",
  referee: "R. Costa",
  sources: [
    { id: "src-1", source: "YouTube", embedUrl: "https://www.youtube.com/embed/sportsrc-a", hd: true },
    { id: "src-2", source: "Twitch", embedUrl: "https://www.twitch.tv/embed/sportsrc-b", hd: false },
  ],
};

beforeEach(() => {
  loadMatches.mockReset();
  loadMatchDetail.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StreamLivePage", () => {
  it("rotates the hero ticker through the live and upcoming fixtures", async () => {
    vi.useFakeTimers();
    loadMatches.mockResolvedValue([sportsrcLive, sportsrcUpcoming]);

    const { container } = render(<StreamLivePage />);
    // Flush the mocked feed's microtasks without waiting on real timers.
    await act(async () => {});

    expect(container.querySelectorAll(".sh-ticker-dot")).toHaveLength(2);
    const hero = container.querySelector(".sh-feature");
    expect(hero.querySelector(".sh-live-pill").textContent).toBe("Live");
    expect(hero.querySelector(".sh-feature-team").textContent).toContain("União Leiria");
    expect(hero.querySelector(".sh-feature-score").textContent).toBe("44");

    act(() => {
      vi.advanceTimersByTime(HERO_TICKER_MS);
    });
    expect(hero.querySelector(".sh-feature-team").textContent).toContain("Benfica");
    expect(hero.querySelector(".sh-feature-comp").textContent).toBe("Liga Revelação U23");
  });

  it("opens the livestream from the hero's Watch button", async () => {
    loadMatches.mockResolvedValue([sportsrcLive, sportsrcUpcoming]);
    loadMatchDetail.mockResolvedValue(sportsrcDetail);

    const { container } = render(<StreamLivePage />);

    await waitFor(() => expect(container.querySelectorAll(".sh-ticker-dot")).toHaveLength(2));
    fireEvent.click(container.querySelector(".sh-feature .sh-watch-btn"));

    const overlay = await waitFor(() => {
      const node = container.querySelector(".sh-stream-overlay");
      expect(node).toBeTruthy();
      return node;
    });
    expect(overlay.textContent).toContain("Liga Revelação U23");

    const frame = await waitFor(() => {
      const node = container.querySelector(".sh-stream-frame");
      expect(node).toBeTruthy();
      return node;
    });
    expect(frame.getAttribute("src")).toBe("https://www.youtube.com/embed/sportsrc-a");
    expect(overlay.textContent).toContain("Pavilhão João Rocha");
  });

  it("switches between the stream sources", async () => {
    loadMatches.mockResolvedValue([sportsrcLive, sportsrcUpcoming]);
    loadMatchDetail.mockResolvedValue(sportsrcDetail);

    const { container } = render(<StreamLivePage />);

    await waitFor(() => expect(container.querySelectorAll(".sh-ticker-dot")).toHaveLength(2));
    fireEvent.click(container.querySelector("#section-sportsrc .sh-watch-btn"));

    const frame = await waitFor(() => {
      const node = container.querySelector(".sh-stream-frame");
      expect(node).toBeTruthy();
      return node;
    });

    fireEvent.click(container.querySelectorAll(".sh-stream-tab")[1]);
    await waitFor(() =>
      expect(frame.getAttribute("src")).toBe("https://www.twitch.tv/embed/sportsrc-b")
    );
  });

  it("closes the livestream on the close button and on Escape", async () => {
    loadMatches.mockResolvedValue([sportsrcLive, sportsrcUpcoming]);
    loadMatchDetail.mockResolvedValue(sportsrcDetail);

    const { container } = render(<StreamLivePage />);

    await waitFor(() => expect(container.querySelectorAll(".sh-ticker-dot")).toHaveLength(2));
    fireEvent.click(container.querySelector("#section-sportsrc .sh-watch-btn"));
    await waitFor(() => expect(container.querySelector(".sh-stream-overlay")).toBeTruthy());

    fireEvent.click(container.querySelector(".sh-stream-close"));
    await waitFor(() => expect(container.querySelector(".sh-stream-overlay")).toBeNull());

    fireEvent.click(container.querySelector("#section-sportsrc .sh-watch-btn"));
    await waitFor(() => expect(container.querySelector(".sh-stream-overlay")).toBeTruthy());
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(container.querySelector(".sh-stream-overlay")).toBeNull());
  });

  it("surfaces an error when the stream detail cannot be fetched", async () => {
    loadMatches.mockResolvedValue([sportsrcLive, sportsrcUpcoming]);
    loadMatchDetail.mockRejectedValue(new Error("Sportsrc 404 for https://api.sportsrc.org/v3/?type=detail&id=liga-live-1"));

    const { container } = render(<StreamLivePage />);

    await waitFor(() => expect(container.querySelectorAll(".sh-ticker-dot")).toHaveLength(2));
    fireEvent.click(container.querySelector("#section-sportsrc .sh-watch-btn"));

    await waitFor(() => {
      expect(container.querySelector(".sh-stream-overlay")).toBeTruthy();
      expect(container.textContent).toContain("Sportsrc 404");
    });
    expect(container.querySelector(".sh-stream-frame")).toBeNull();
  });

  it("shows the fixture list with its own Watch buttons", async () => {
    loadMatches.mockResolvedValue([sportsrcLive, sportsrcUpcoming]);
    loadMatchDetail.mockResolvedValue({ ...sportsrcDetail, sources: [] });

    const { container } = render(<StreamLivePage />);

    await waitFor(() => expect(container.querySelectorAll(".sh-game")).toHaveLength(2));
    const panel = container.querySelector("#section-sportsrc");
    expect(panel.textContent).toContain("2 fixtures");
    expect(panel.querySelectorAll(".sh-watch-btn")).toHaveLength(2);

    fireEvent.click(panel.querySelector(".sh-watch-btn"));
    await waitFor(() => expect(container.querySelector(".sh-stream-overlay")).toBeTruthy());
    await waitFor(() =>
      expect(container.textContent).toContain("No stream sources available")
    );
  });
});
