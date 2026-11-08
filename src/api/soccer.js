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
  "fra.1": {
    key: "fra.1",
    sport: "soccer",
    path: "soccer/fra.1",
    competitionId: "fra.1",
    competition: "Ligue 1",
    country: "France",
  },
  "ned.1": {
    key: "ned.1",
    sport: "soccer",
    path: "soccer/ned.1",
    competitionId: "ned.1",
    competition: "Eredivisie",
    country: "Netherlands",
  },
  "por.1": {
    key: "por.1",
    sport: "soccer",
    path: "soccer/por.1",
    competitionId: "por.1",
    competition: "Primeira Liga",
    country: "Portugal",
  },
  "sco.1": {
    key: "sco.1",
    sport: "soccer",
    path: "soccer/sco.1",
    competitionId: "sco.1",
    competition: "Scottish Premiership",
    country: "Scotland",
  },
  "uefa.champions": {
    key: "uefa.champions",
    sport: "soccer",
    path: "soccer/uefa.champions",
    competitionId: "uefa.champions",
    competition: "Champions League",
    country: "Europe",
  },
  "uefa.europa": {
    key: "uefa.europa",
    sport: "soccer",
    path: "soccer/uefa.europa",
    competitionId: "uefa.europa",
    competition: "Europa League",
    country: "Europe",
  },
  "uefa.europa.conf": {
    key: "uefa.europa.conf",
    sport: "soccer",
    path: "soccer/uefa.europa.conf",
    competitionId: "uefa.europa.conf",
    competition: "Conference League",
    country: "Europe",
  },
  "uefa.nations": {
    key: "uefa.nations",
    sport: "soccer",
    path: "soccer/uefa.nations",
    competitionId: "uefa.nations",
    competition: "Nations League",
    country: "Europe",
  },
  "eng.fa": {
    key: "eng.fa",
    sport: "soccer",
    path: "soccer/eng.fa",
    competitionId: "eng.fa",
    competition: "FA Cup",
    country: "United Kingdom",
  },
  "mex.1": {
    key: "mex.1",
    sport: "soccer",
    path: "soccer/mex.1",
    competitionId: "mex.1",
    competition: "Liga MX",
    country: "Mexico",
  },
  "bra.1": {
    key: "bra.1",
    sport: "soccer",
    path: "soccer/bra.1",
    competitionId: "bra.1",
    competition: "Brasileirão",
    country: "Brazil",
  },
};

/** Leagues merged into the football (soccer) board, in display order. */
export const SOCCER_LIVE_LEAGUES = [
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "ned.1",
  "por.1",
  "sco.1",
  "uefa.champions",
  "uefa.europa",
  "uefa.europa.conf",
  "uefa.nations",
  "eng.fa",
  "mex.1",
  "bra.1",
];

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
