import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BasketballPage from "./BasketballPage";
import NFLPage from "./NFLPage";

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

  it("narrows the fixtures when the LIVE filter is selected", () => {
    const { container, getByRole } = render(<BasketballPage />);
    fireEvent.click(getByRole("tab", { name: "LIVE" }));
    expect(gameCards(container)).toHaveLength(2);
  });

  it("filters by competition from the league sidebar", () => {
    const { container, getByRole } = render(<BasketballPage />);
    fireEvent.click(getByRole("button", { name: "WNBA" }));
    expect(gameCards(container)).toHaveLength(1);
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
    fireEvent.click(getByRole("button", { name: "NFC" }));
    expect(gameCards(container)).toHaveLength(2);
  });
});
