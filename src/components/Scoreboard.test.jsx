import { describe, expect, it, vi, afterEach } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { HERO_TICKER_MS, HeroTicker } from "./Scoreboard";

const games = [
  {
    id: 1,
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
    broadcast: "ABC",
  },
  {
    id: 2,
    competitionId: "euroleague",
    competition: "EuroLeague",
    country: null,
    status: "UPCOMING",
    clock: "Tipoff 19:00",
    home: "Real Madrid",
    away: "Barcelona",
    homeCode: "RMB",
    awayCode: "BAR",
    homeScore: null,
    awayScore: null,
    venue: "WiZink Center",
    broadcast: "EuroLeague TV",
  },
  {
    id: 3,
    competitionId: "nbl",
    competition: "NBL",
    country: "Australia",
    status: "UPCOMING",
    clock: "Tipoff 12:30",
    home: "Sydney Kings",
    away: "Melbourne United",
    homeCode: "SK",
    awayCode: "MU",
    homeScore: null,
    awayScore: null,
    venue: "Qudos Bank Arena",
    broadcast: null,
  },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HeroTicker", () => {
  it("renders the empty state when there are no games", () => {
    const { container } = render(<HeroTicker games={[]} />);

    const hero = container.querySelector(".sh-feature");
    expect(hero.className).toContain("sh-feature-empty");
    expect(hero.querySelector(".sh-live-pill").textContent).toBe("No live game");
    expect(hero.textContent).toContain("Nothing on the court right now");
    expect(hero.querySelector(".sh-ticker-bar")).toBeNull();
  });

  it("starts on the live game with its clock and both scores", () => {
    const { container } = render(<HeroTicker games={games} />);

    const hero = container.querySelector(".sh-feature");
    expect(hero.querySelector(".sh-live-pill").textContent).toBe("Live");
    expect(hero.querySelector(".sh-feature-clock").textContent).toBe("Q3 · 04:32");
    const scores = [...hero.querySelectorAll(".sh-feature-score")].map((node) => node.textContent);
    expect(scores).toEqual(["84", "79"]);
    expect(hero.textContent).toContain("in progress");
  });

  it("rotates automatically like a ticker", () => {
    vi.useFakeTimers();
    const { container } = render(<HeroTicker games={games} />);

    expect(container.querySelector(".sh-ticker-count").textContent).toBe("1 / 3");
    expect(container.querySelector(".sh-feature-comp").textContent).toBe("NBA");

    act(() => {
      vi.advanceTimersByTime(HERO_TICKER_MS);
    });

    expect(container.querySelector(".sh-ticker-count").textContent).toBe("2 / 3");
    expect(container.querySelector(".sh-feature-comp").textContent).toBe("EuroLeague");
    expect(container.querySelector(".sh-feature-team").textContent).toBe("Real Madrid");

    act(() => {
      vi.advanceTimersByTime(HERO_TICKER_MS * 2);
    });

    // Wraps back to the first match.
    expect(container.querySelector(".sh-ticker-count").textContent).toBe("1 / 3");
    expect(container.querySelector(".sh-feature-comp").textContent).toBe("NBA");
  });

  it("pauses while the pointer rests on the board", () => {
    vi.useFakeTimers();
    const { container } = render(<HeroTicker games={games} />);

    fireEvent.mouseEnter(container.querySelector(".sh-feature"));
    act(() => {
      vi.advanceTimersByTime(HERO_TICKER_MS * 3);
    });
    expect(container.querySelector(".sh-ticker-count").textContent).toBe("1 / 3");

    fireEvent.mouseLeave(container.querySelector(".sh-feature"));
    act(() => {
      vi.advanceTimersByTime(HERO_TICKER_MS);
    });
    expect(container.querySelector(".sh-ticker-count").textContent).toBe("2 / 3");
  });

  it("navigates with the arrows and the dots", () => {
    vi.useFakeTimers();
    const { container, getByRole } = render(<HeroTicker games={games} />);

    fireEvent.click(getByRole("button", { name: "Next match" }));
    expect(container.querySelector(".sh-ticker-count").textContent).toBe("2 / 3");

    fireEvent.click(getByRole("button", { name: "Match 3 of 3: Sydney Kings v Melbourne United" }));
    expect(container.querySelector(".sh-feature-comp").textContent).toBe("NBL");
    expect(container.querySelector(".sh-feature-team").textContent).toBe("Sydney Kings");

    fireEvent.click(getByRole("button", { name: "Previous match" }));
    expect(container.querySelector(".sh-ticker-count").textContent).toBe("2 / 3");
  });

  it("labels matches with their continent until the board is filtered", () => {
    const { container, rerender } = render(
      <HeroTicker
        games={games}
        showContinents
        continentOf={(game) => ({ nba: "North America", euroleague: "Europe", nbl: "Oceania" }[game.competitionId] ?? null)}
      />
    );

    expect(container.querySelector(".sh-feature-comp").textContent).toBe("North America · NBA");

    rerender(
      <HeroTicker
        games={games}
        showContinents={false}
        continentOf={(game) => ({ nba: "North America", euroleague: "Europe", nbl: "Oceania" }[game.competitionId] ?? null)}
      />
    );

    expect(container.querySelector(".sh-feature-comp").textContent).toBe("NBA");
  });

  it("keeps a single game static with no controls", () => {
    vi.useFakeTimers();
    const { container } = render(<HeroTicker games={[games[0]]} />);

    act(() => {
      vi.advanceTimersByTime(HERO_TICKER_MS * 2);
    });

    const hero = container.querySelector(".sh-feature");
    expect(hero.querySelector(".sh-feature-comp").textContent).toBe("NBA");
    expect(hero.querySelector(".sh-ticker-bar")).toBeNull();
  });
});
