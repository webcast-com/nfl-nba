/**
 * Football (soccer) ESPN endpoints — kept in their own module, with the
 * basketball/football endpoints in src/api/espn.js. The shared request layer,
 * sport-parameterized normalizer and URL builders live in espn.js; the soccer
 * league definitions register into its league registry so keys like "eng.1"
 * still resolve from the shared loaders (loadMatchSummary, loadNews, …).
 */
import {
  registerLeagues,
  mergeScoreboards,
  liveCarryOver,
  loadStandings,
} from "./espn";

/**
 * Soccer competitions tracked in demo. ESPN indexes them on the soccer sport
 * path — eng.1 is the Premier League, uefa.champions is the Champions League.
 */
export const SOCCER_LEAGUES = {
  "eng.1": {
    key: "eng.1",
    sport: "soccer",
    path: "soccer/eng.1",
    competitionId: "eng.1",
    competition: "Premier League",
    country: "United Kingdom",
  },
  "esp.1": {
    key: "esp.1",
    sport: "soccer",
    path: "soccer/esp.1",
    competitionId: "esp.1",
    competition: "La Liga",
    country: "Spain",
  },
  "ita.1": {
    key: "ita.1",
    sport: "soccer",
    path: "soccer/ita.1",
    competitionId: "ita.1",
    competition: "Serie A",
    country: "Italy",
  },
  "ger.1": {
    key: "ger.1",
    sport: "soccer",
    path: "soccer/ger.1",
    competitionId: "ger.1",
    competition: "Bundesliga",
    country: "Germany",
  },
  "uefa.champions": {
    key: "uefa.champions",
    sport: "soccer",
    path: "soccer/uefa.champions",
    competitionId: "uefa.champions",
    competition: "Champions League",
    country: "Europe",
  },
};

/** Leagues merged into the football (soccer) board. */
export const SOCCER_LIVE_LEAGUES = ["eng.1", "esp.1", "ita.1", "ger.1", "uefa.champions"];

/** Which ESPN leagues feed the soccer board, narrowed to one competition. */
export function liveLeaguesForSoccer(competition) {
  if (competition && competition !== "all") {
    const league = SOCCER_LIVE_LEAGUES.includes(competition)
      ? competition
      : SOCCER_LEAGUES[competition]?.key;
    if (league) return [league];
  }
  return SOCCER_LIVE_LEAGUES;
}

/**
 * The soccer boards run on the calendar day: ESPN answers with today's
 * fixtures, and the matches from the previous evening that are still in
 * progress get carried over — a 19:45 UTC kickoff is still live at lunchtime
 * the next day. Standings come back for the selected league, or for every
 * tracked league while the board shows "All competitions".
 */
export async function fetchSoccerSnapshot({ date, force = false, season, competition } = {}) {
  const leagues = liveLeaguesForSoccer(competition);
  const { games, meta } = await mergeScoreboards(leagues, { date, force });

  const carryOver = await liveCarryOver(leagues, {
    date,
    force,
    seen: new Set(games.map((game) => String(game.id))),
  });
  const allGames = [...carryOver, ...games];

  const standingsLeagues = competition && competition !== "all" ? [competition] : leagues;
  const groups = await Promise.all(
    standingsLeagues.map(async (key) => {
      try {
        // ESPN indexes soccer seasons by their start year (2026 → 2026-27).
        return await loadStandings(key, { season: season ?? meta?.seasonYear, force });
      } catch {
        return []; // cup boards with no table keep the demo tables
      }
    })
  );
  const standings = groups.flat();

  return { games: allGames, standings, meta };
}

registerLeagues(SOCCER_LEAGUES);
