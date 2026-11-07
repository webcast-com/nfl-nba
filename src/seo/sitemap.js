/** Sitemap and robots generation for the SPA's crawlable routes.
 *
 * The app is client-rendered, so the sitemap lists the URLs Vercel's SPA
 * rewrite serves for every route: the static hubs, plus one entry per
 * bundled team, player and demo match. Team and player keys match the
 * slugify() convention the detail pages use.
 */
import { slugify } from "../utils/entities.js";

export const DEFAULT_ORIGIN = "https://sportscore.hyper.co.ke";

const STATIC_PAGES = [
  { path: "/basketball", priority: "1.0", changefreq: "daily" },
  { path: "/basketball/upcoming", priority: "0.9", changefreq: "daily" },
  { path: "/basketball/top-scorers", priority: "0.9", changefreq: "weekly" },
  { path: "/basketball/news", priority: "0.9", changefreq: "daily" },
  { path: "/nfl", priority: "1.0", changefreq: "daily" },
  { path: "/nfl/upcoming", priority: "0.9", changefreq: "daily" },
  { path: "/nfl/top-scorers", priority: "0.9", changefreq: "weekly" },
  { path: "/nfl/news", priority: "0.9", changefreq: "daily" },
  { path: "/soccer", priority: "1.0", changefreq: "daily" },
  { path: "/soccer/upcoming", priority: "0.9", changefreq: "daily" },
  { path: "/soccer/top-scorers", priority: "0.9", changefreq: "weekly" },
  { path: "/soccer/news", priority: "0.9", changefreq: "daily" },
  { path: "/cricket", priority: "0.6", changefreq: "monthly" },
  { path: "/streamlive", priority: "0.9", changefreq: "daily" },
  { path: "/badminton", priority: "0.6", changefreq: "monthly" },
  { path: "/hockey", priority: "0.6", changefreq: "monthly" },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlFor(origin, path) {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds the sitemap entries for one origin.
 * @param {object} options
 * @param {string} [options.origin] site root, e.g. https://sportscore.hyper.co.ke
 * @param {Array} [options.now] date source (defaults to today)
 * @param {Array} options.data per-sport bundles: { sport, games, standings, leaders }
 */
export function collectUrls({ origin = DEFAULT_ORIGIN, data, now = new Date() } = {}) {
  const urls = [];
  const seen = new Set();
  const add = (path, priority, changefreq) => {
    const loc = urlFor(origin, path);
    if (seen.has(loc)) return;
    seen.add(loc);
    urls.push({
      loc,
      lastmod: now.toISOString().slice(0, 10),
      changefreq,
      priority,
    });
  };

  for (const page of STATIC_PAGES) add(page.path, page.priority, page.changefreq);

  for (const config of data ?? []) {
    const hub =
      config.hub ??
      (config.sport === "football" ? "/nfl" : config.sport === "soccer" ? "/soccer" : "/basketball");
    const teams = new Set();

    for (const game of config.games ?? []) {
      if (game?.id != null) add(`${hub}/match/${game.id}`, "0.7", "daily");
      if (game?.home) teams.add(game.home);
      if (game?.away) teams.add(game.away);
    }
    for (const board of config.standings ?? []) {
      for (const row of board?.rows ?? []) {
        if (row?.team) teams.add(row.team);
      }
    }
    for (const name of teams) add(`${hub}/team/${slugify(name)}`, "0.8", "weekly");
    for (const player of config.leaders ?? []) {
      if (player?.name) add(`${hub}/player/${slugify(player.name)}`, "0.7", "weekly");
    }
  }

  return urls;
}

export function renderSitemapXml(urls) {
  const entries = urls
    .map(
      (url) =>
        `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n    <lastmod>${url.lastmod}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function renderRobotsTxt(origin = DEFAULT_ORIGIN) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${urlFor(origin, "/sitemap.xml")}\n`;
}
