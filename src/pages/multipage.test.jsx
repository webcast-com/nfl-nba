import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BasketballPage from "./BasketballPage";
import NFLPage from "./NFLPage";
import NewsPage from "./NewsPage";
import TopScorersPage from "./TopScorersPage";
import UpcomingPage from "./UpcomingPage";
import MatchPage from "./MatchPage";
import { SubNav } from "../components/SubNav";

afterEach(cleanup);

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SubNav />
      <Routes>
        <Route path="/basketball" element={<BasketballPage />} />
        <Route path="/nfl" element={<NFLPage />} />
        <Route path="/basketball/news" element={<NewsPage sport="basketball" />} />
        <Route path="/nfl/news" element={<NewsPage sport="football" />} />
        <Route path="/basketball/top-scorers" element={<TopScorersPage sport="basketball" />} />
        <Route path="/nfl/top-scorers" element={<TopScorersPage sport="football" />} />
        <Route path="/basketball/upcoming" element={<UpcomingPage sport="basketball" />} />
        <Route path="/nfl/upcoming" element={<UpcomingPage sport="football" />} />
        <Route path="/basketball/match/:matchId" element={<MatchPage sport="basketball" />} />
        <Route path="/nfl/match/:matchId" element={<MatchPage sport="football" />} />
      </Routes>
    </MemoryRouter>
  );

const subnavLabels = (container) =>
  [...container.querySelectorAll(".sh-subnav-link")].map((node) => node.textContent.trim());

describe("sub navigation", () => {
  it("lists the four screens of a hub and marks the current one", () => {
    const { container } = renderAt("/basketball/top-scorers");
    expect(subnavLabels(container)).toEqual(["Live", "Upcoming", "Top scorers", "News"]);

    const active = container.querySelector(".sh-subnav-link.is-active");
    expect(active.textContent).toBe("Top scorers");
    expect(active.getAttribute("aria-current")).toBe("page");
    expect(container.querySelector('a[href="/basketball/news"]')).toBeTruthy();
  });

  it("follows the sport in the URL", () => {
    const { container } = renderAt("/nfl/news");
    expect(container.querySelector('a[href="/nfl/top-scorers"]')).toBeTruthy();
    expect(container.querySelector('a[href="/basketball/news"]')).toBeNull();
  });

  it("keeps Live lit on a match screen", () => {
    const { container } = renderAt("/basketball/match/1");
    expect(container.querySelector(".sh-subnav-link.is-active").textContent).toBe("Live");
  });

  it("renders nothing outside a hub", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <SubNav />
      </MemoryRouter>
    );
    expect(container.querySelector(".sh-subnav")).toBeNull();
  });
});

describe("news page", () => {
  it("renders the basketball newsroom", () => {
    const { container, getByRole } = renderAt("/basketball/news");
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Latest news");
    expect(container.textContent).toContain("Basketball newsroom");
    expect(container.querySelectorAll(".sh-news-card").length).toBeGreaterThanOrEqual(6);
    expect(container.textContent).toContain("Nairobi City Thunder book their place in the BAL final");
  });

  it("switches to NFL stories for the football hub", () => {
    const { container } = renderAt("/nfl/news");
    expect(container.textContent).toContain("Football newsroom");
    expect(container.textContent).toContain("Chiefs and Bills trade blows in an AFC heavyweight bout");
    expect(container.textContent).not.toContain("Nairobi City Thunder");
  });

  it("links back to the hub", () => {
    const { container } = renderAt("/basketball/news");
    const back = container.querySelector(".sh-detail-note a");
    expect(back.getAttribute("href")).toBe("/basketball");
    expect(back.textContent).toBe("Back to the Basketball hub");
  });
});

describe("top scorers page", () => {
  it("renders every basketball leaderboard", () => {
    const { container, getByRole } = renderAt("/basketball/top-scorers");
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Top scorers");
    expect(container.querySelectorAll(".sh-scorers-grid .sh-detail-panel")).toHaveLength(4);
    expect(container.textContent).toContain("Points per game");
    expect(container.textContent).toContain("Rebounds per game");
    expect(container.textContent).toContain("33.9");
    expect(container.querySelectorAll(".sh-scorer-list li")).toHaveLength(20);
  });

  it("links leaders who have a profile page", () => {
    const { container } = renderAt("/basketball/top-scorers");
    const link = container.querySelector('a[href="/basketball/player/luka-doncic"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain("Luka Dončić");
  });

  it("uses the football boards for the NFL hub", () => {
    const { container } = renderAt("/nfl/top-scorers");
    expect(container.textContent).toContain("Football leaderboards");
    expect(container.textContent).not.toContain("Luka Dončić");
  });
});

describe("upcoming page", () => {
  it("lists only matches still to be played", () => {
    const { container, getByRole } = renderAt("/basketball/upcoming");
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Upcoming");
    const fixtures = container.querySelectorAll(".sh-detail-fixture");
    expect(fixtures).toHaveLength(4);
    expect(container.textContent).toContain("In progress");
    expect(container.textContent).not.toContain("Detroit Pistons");
  });

  it("links each fixture to its commentary screen", () => {
    const { container } = renderAt("/basketball/upcoming");
    const hrefs = [...container.querySelectorAll("a.sh-fixture-link")].map((a) => a.getAttribute("href"));
    expect(hrefs.slice(0, 2)).toEqual(["/basketball/match/1", "/basketball/match/2"]);
    expect(new Set(hrefs.slice(2))).toEqual(new Set(["/basketball/match/3", "/basketball/match/5"]));
  });

  it("groups NFL fixtures by day", () => {
    const { container } = renderAt("/nfl/upcoming");
    expect(container.textContent).toContain("Football schedule");
    expect(container.querySelectorAll(".sh-detail-fixture")).toHaveLength(3);
    expect(container.querySelectorAll(".sh-detail-panel")).toHaveLength(2);
  });
});

describe("match page", () => {
  it("shows the scoreline and the sample commentary", () => {
    const { container } = renderAt("/basketball/match/1");
    expect(container.querySelector(".sh-match-hero")).toBeTruthy();
    expect(container.textContent).toContain("Boston Celtics");
    expect(container.textContent).toContain("New York Knicks");
    expect(container.textContent).toContain("84");
    expect(container.querySelectorAll(".sh-commentary li")).toHaveLength(7);
    expect(container.textContent).toContain("Sample play-by-play");
    const last = container.querySelector(".sh-commentary li:last-child");
    expect(last.textContent).toContain("84-79");
  });

  it("keeps the last play in step with the scoreline", () => {
    const { container } = renderAt("/basketball/match/1");
    const scores = [...container.querySelectorAll(".sh-commentary-score")].map((n) => n.textContent);
    expect(scores.at(-1)).toBe("84-79");
  });

  it("renders the football fixture with its own commentary", () => {
    const { container } = renderAt("/nfl/match/14");
    expect(container.textContent).toContain("Detroit Lions");
    expect(container.querySelectorAll(".sh-commentary li")).toHaveLength(4);
    expect(container.textContent).toContain("Final");
  });

  it("falls back to an empty state for an unknown match", () => {
    const { container } = renderAt("/basketball/match/999999");
    expect(container.textContent).toContain("We couldn't find that match");
    expect(container.querySelector(".sh-match-hero")).toBeNull();
  });
});

describe("hub links into the new screens", () => {
  it("links every game card to its match screen", () => {
    const { container } = renderAt("/basketball");
    expect(container.querySelector('a.sh-match-link[href="/basketball/match/1"]')).toBeTruthy();
  });

  it("links the NFL hub game cards under /nfl", () => {
    const { container } = renderAt("/nfl");
    const link = container.querySelector('a.sh-match-link[href="/nfl/match/11"]');
    expect(link).toBeTruthy();
    expect(container.querySelector('a.sh-match-link[href="/basketball/match/11"]')).toBeNull();
  });
});
