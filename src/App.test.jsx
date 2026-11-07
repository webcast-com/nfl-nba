import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
});

describe("App shell", () => {
  it("renders the sport tabs and redirects to the basketball dashboard", () => {
    const { getByRole, getByText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    ["Basketball", "Football", "Soccer", "StreamLive", "Badminton", "Hockey"].forEach((label) => {
      expect(getByRole("link", { name: label })).toBeTruthy();
    });
    expect(getByText("Basketball Center")).toBeTruthy();
  });

  it("serves the StreamLive page on /streamlive", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/streamlive"]}>
        <App />
      </MemoryRouter>
    );
    expect(getByRole("heading", { name: "StreamLive" })).toBeTruthy();
  });

  it("switches the color theme", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/basketball"]}>
        <App />
      </MemoryRouter>
    );
    fireEvent.click(getByRole("button", { name: "Light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("renders a placeholder for sports without a feed yet", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/badminton"]}>
        <App />
      </MemoryRouter>
    );
    expect(getByText("Badminton coverage is coming soon")).toBeTruthy();
  });

  it("serves the football (soccer) hub on the old cricket path too", () => {
    const { getByText, getByRole } = render(
      <MemoryRouter initialEntries={["/cricket"]}>
        <App />
      </MemoryRouter>
    );
    expect(getByText("Football (Soccer) Center")).toBeTruthy();
    expect(getByRole("link", { name: "Soccer" })).toBeTruthy();
  });
});
