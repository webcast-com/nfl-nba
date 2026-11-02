import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BasketballPage from "./BasketballPage";
import NFLPage from "./NFLPage";

afterEach(cleanup);

const gameCards = (container) => container.querySelectorAll(".sh-game");

describe("BasketballPage", () => {
  it("renders the full demo fixture list", () => {
    const { container, getByText } = render(<BasketballPage />);
    expect(getByText("Basketball Center")).toBeTruthy();
    expect(gameCards(container)).toHaveLength(6);
  });

  it("narrows the fixtures when the LIVE filter is selected", () => {
    const { container, getByRole } = render(<BasketballPage />);
    fireEvent.click(getByRole("button", { name: "LIVE" }));
    expect(gameCards(container)).toHaveLength(2);
  });
});

describe("NFLPage", () => {
  it("renders fixtures and division standings", () => {
    const { container, getByText } = render(
      <MemoryRouter>
        <NFLPage />
      </MemoryRouter>
    );
    expect(getByText("NFL Center")).toBeTruthy();
    expect(gameCards(container)).toHaveLength(4);
    expect(container.querySelectorAll(".sh-table")).toHaveLength(4);
  });
});
