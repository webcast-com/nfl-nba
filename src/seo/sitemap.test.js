import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORIGIN,
  collectUrls,
  renderRobotsTxt,
  renderSitemapXml,
} from "./sitemap";

const ORIGIN = "https://sportscore.hyper.co.ke";

const data = [
  {
    sport: "basketball",
    games: [
      { id: 1, home: "Boston Celtics", away: "New York Knicks" },
      { id: 2, home: "Lakers", away: "Celtics" },
    ],
    standings: [{ group: "NBA", rows: [{ team: "Boston Celtics" }, { team: "Milwaukee Bucks" }] }],
    leaders: [{ name: "Luka Dončić" }, { name: "Jayson Tatum" }],
  },
  {
    sport: "football",
    games: [{ id: 11, home: "Kansas City Chiefs", away: "Buffalo Bills" }],
    standings: [{ group: "AFC", rows: [{ team: "Kansas City Chiefs" }] }],
    leaders: [{ name: "Patrick Mahomes" }],
  },
];

describe("sitemap generation", () => {
  it("lists the static hubs and coming-soon pages", () => {
    const locs = collectUrls({ origin: ORIGIN, data }).map((url) => url.loc);
    for (const path of [
      "/basketball",
      "/basketball/upcoming",
      "/basketball/top-scorers",
      "/basketball/news",
      "/nfl",
      "/nfl/upcoming",
      "/nfl/top-scorers",
      "/nfl/news",
      "/soccer",
      "/soccer/upcoming",
      "/soccer/top-scorers",
      "/soccer/news",
      "/cricket",
      "/badminton",
      "/hockey",
    ]) {
      expect(locs).toContain(`${ORIGIN}${path}`);
    }
  });

  it("lists one URL per bundled team, player and match with sport hubs", () => {
    const locs = collectUrls({ origin: ORIGIN, data }).map((url) => url.loc);
    expect(locs).toContain(`${ORIGIN}/basketball/team/boston-celtics`);
    expect(locs).toContain(`${ORIGIN}/basketball/team/milwaukee-bucks`);
    expect(locs).toContain(`${ORIGIN}/basketball/player/luka-doncic`);
    expect(locs).toContain(`${ORIGIN}/nfl/team/kansas-city-chiefs`);
    expect(locs).toContain(`${ORIGIN}/nfl/player/patrick-mahomes`);
    expect(locs).toContain(`${ORIGIN}/basketball/match/1`);
    expect(locs).toContain(`${ORIGIN}/nfl/match/11`);
  });

  it("dedupes repeated teams and skips entries without data", () => {
    const locs = collectUrls({ origin: ORIGIN, data }).map((url) => url.loc);
    expect(locs.filter((loc) => loc.endsWith("/team/boston-celtics"))).toHaveLength(1);
    expect(locs).not.toContain(`${ORIGIN}/basketball/match/`);
    const sparse = collectUrls({
      origin: ORIGIN,
      data: [{ sport: "basketball", games: [{ id: null }], standings: [], leaders: [{}] }],
    });
    expect(sparse).toHaveLength(15); // just the static pages
  });

  it("sets lastmod, changefreq and priority on every entry", () => {
    const urls = collectUrls({ origin: ORIGIN, data, now: new Date("2026-11-07T12:00Z") });
    for (const url of urls) {
      expect(url.loc).toMatch(/^https:\/\//);
      expect(url.lastmod).toBe("2026-11-07");
      expect(url.changefreq).toMatch(/^(daily|weekly|monthly)$/);
      expect(url.priority).toMatch(/^[0-9.]+$/);
    }
    expect(urls.find((url) => url.loc.endsWith("/basketball")).priority).toBe("1.0");
  });

  it("renders valid XML with escaped characters", () => {
    const xml = renderSitemapXml(
      collectUrls({ origin: ORIGIN, data, now: new Date("2026-11-07T12:00Z") })
    );
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${ORIGIN}/basketball</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/basketball/player/luka-doncic</loc>`);
    expect(xml).toContain("</urlset>");

    const escaped = renderSitemapXml([
      { loc: `${ORIGIN}/nfl/team/a&b<c>`, lastmod: "2026-11-07", changefreq: "weekly", priority: "0.8" },
    ]);
    expect(escaped).toContain("/nfl/team/a&amp;b&lt;c&gt;");
  });

  it("renders robots.txt that allows crawling and points at the sitemap", () => {
    const robots = renderRobotsTxt(ORIGIN);
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(renderRobotsTxt(DEFAULT_ORIGIN)).toContain(`${DEFAULT_ORIGIN}/sitemap.xml`);
  });
});
