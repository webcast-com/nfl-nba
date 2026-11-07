#!/usr/bin/env node
/** Regenerates public/sitemap.xml and public/robots.txt from the bundled data
 * so crawlers list every route the SPA serves. Run before `vite build`.
 *
 *   npm run sitemap                       # https://sportscore.hyper.co.ke
 *   SITE_ORIGIN=https://x.com npm run sitemap
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  basketballGames,
  basketballLeaders,
  basketballStandings,
  collegeFootballStandings,
  ncaaBasketballStandings,
  ncaaWomenStandings,
  nflGames,
  nflLeaders,
  nflStandings,
} from "../src/data/sportsData.js";
import {
  DEFAULT_ORIGIN,
  collectUrls,
  renderRobotsTxt,
  renderSitemapXml,
} from "../src/seo/sitemap.js";

const origin = process.env.SITE_ORIGIN || DEFAULT_ORIGIN;

// Mirrors src/data/detailConfig.js without pulling the asset-heavy scorers
// module: games + standings give teams and matches, leaders give players.
const data = [
  {
    sport: "basketball",
    games: basketballGames,
    standings: [...basketballStandings, ...ncaaBasketballStandings, ...ncaaWomenStandings],
    leaders: basketballLeaders,
  },
  {
    sport: "football",
    games: nflGames,
    standings: [...nflStandings, ...collegeFootballStandings],
    leaders: nflLeaders,
  },
];

const urls = collectUrls({ origin, data });
const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "sitemap.xml"), renderSitemapXml(urls), "utf8");
writeFileSync(resolve(outDir, "robots.txt"), renderRobotsTxt(origin), "utf8");
console.log(`sitemap.xml + robots.txt written for ${origin} (${urls.length} URLs)`);
