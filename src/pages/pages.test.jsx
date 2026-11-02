import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BasketballPage from "./BasketballPage";
import NFLPage from "./NFLPage";
import { seasonStartForDate, toDateKey } from "../utils/dates";

afterEach(cleanup);

const gameCards = (container) => container.querySelectorAll(".sh-game");

describe("BasketballPage", () => {
  it("renders the full demo scoreboard", () => {
    const { container, getByText } = render(<BasketballPage />);
    expect(getByText("Basketball Center")).toBeTruthy();
    expect(gameCards(container)).toHaveLength(6);
    expect(container.querySelectorAll(".sh-date")).toHaveLength(10);
    expect(container.querySelectorAll(".sh-player")).toHaveLength(4);
    expect(container.querySelector(".sh-feature")).toBeTruthy();
  });

  it("shows kickoff times in the viewer's time zone", () => {
    const { container, getByLabelText } = render(<BasketballPage />);
    expect(getByLabelText(/Kickoff times in your time zone/i).textContent).toMatch(/\w/);

    const upcoming = [...container.querySelectorAll(".sh-clock.is-soon")].map((node) => node.textContent);
    expect(upcoming.length).toBeGreaterThan(0);
    for (const label of upcoming) {
      expect(label).toMatch(/^(Today|Tomorrow|Yesterday|[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}) · \d{2}:\d{2}$/);
    }
  });

  it("narrows the fixtures when the LIVE filter is selected", () => {
    const { container, getByRole } = render(<BasketballPage />);
    fireEvent.click(getByRole("tab", { name: "LIVE" }));
    expect(gameCards(container)).toHaveLength(2);
  });

  it("filters by competition from the league sidebar", () => {
    const { container, getByRole } = render(<BasketballPage />);
    fireEvent.click(getByRole("button", { name: "Competition: WNBA" }));
    expect(gameCards(container)).toHaveLength(1);
  });

  it("filters by continent", () => {
    const { container, getByRole } = render(<BasketballPage />);
    fireEvent.click(getByRole("button", { name: "Continent: Europe" }));
    expect(gameCards(container)).toHaveLength(2); // EuroLeague + Liga ACB
  });

  it("filters by gender and narrows the competition list", () => {
    const { container, getByRole, queryByRole, getByText } = render(<BasketballPage />);
    fireEvent.click(getByRole("button", { name: "Gender: Women" }));
    expect(gameCards(container)).toHaveLength(1); // WNBA
    expect(getByRole("button", { name: "Competition: WNBA" })).toBeTruthy();
    expect(queryByRole("button", { name: "Competition: NBA" })).toBeNull();
    expect(getByText("Popular Leagues")).toBeTruthy();
  });

  it("filters by country and keeps the Kenya leagues visible", () => {
    const { container, getByRole, queryByRole } = render(<BasketballPage />);
    fireEvent.click(getByRole("button", { name: "Country: Kenya" }));
    expect(getByRole("button", { name: "Competition: Kenya National Basketball League" })).toBeTruthy();
    expect(getByRole("button", { name: "Competition: Kenya Women's Basketball League" })).toBeTruthy();
    expect(queryByRole("button", { name: "Competition: NBA" })).toBeNull();
    expect(gameCards(container)).toHaveLength(0);
    expect(container.querySelector(".sh-empty")).toBeTruthy();
  });

  it("switches season and moves the scoreboard date into that season", () => {
    const { container, getByLabelText, getAllByText } = render(<BasketballPage />);
    const currentSeason = seasonStartForDate(toDateKey());
    const select = getByLabelText("Season");
    expect(select.value).toBe(String(currentSeason));

    fireEvent.change(select, { target: { value: String(currentSeason - 2) } });

    expect(select.value).toBe(String(currentSeason - 2));
    expect(container.querySelector(".sh-date.is-active").textContent).toContain("01");
    expect(getAllByText(new RegExp(`${currentSeason - 2}-${currentSeason - 1}`)).length).toBeGreaterThan(0);
  });
});

describe("NFLPage", () => {
  it("renders fixtures and division standings", () => {
    const { container, getByText, getAllByRole } = render(
      <MemoryRouter>
        <NFLPage />
      </MemoryRouter>
    );
    expect(getByText("NFL Center")).toBeTruthy();
    expect(gameCards(container)).toHaveLength(4);
    expect(container.querySelectorAll(".sh-table")).toHaveLength(4);
    expect(getAllByRole("tab", { name: "LIVE" }).length).toBe(1);
  });

  it("filters by conference from the sidebar", () => {
    const { container, getByRole } = render(
      <MemoryRouter>
        <NFLPage />
      </MemoryRouter>
    );
    fireEvent.click(getByRole("button", { name: "Conference: NFC" }));
    expect(gameCards(container)).toHaveLength(2);
  });
});
