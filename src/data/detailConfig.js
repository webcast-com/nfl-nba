import {
  basketballGames,
  basketballLeaders,
  basketballStandings,
  nflGames,
  nflLeaders,
  nflStandings,
} from "./sportsData";

/** Per-sport wiring for the team / player detail pages. */
export const DETAIL_SPORTS = {
  basketball: {
    sport: "basketball",
    games: basketballGames,
    standings: basketballStandings,
    leaders: basketballLeaders,
    competitionId: "nba",
    leagueKey: "nba",
    hub: "/basketball",
    hubLabel: "Basketball",
    label: "NBA",
    nfl: false,
  },
  football: {
    sport: "football",
    games: nflGames,
    standings: nflStandings,
    leaders: nflLeaders,
    competitionId: "nfl",
    leagueKey: "nfl",
    hub: "/nfl",
    hubLabel: "Football",
    label: "NFL",
    nfl: true,
  },
};

export function detailSport(sport) {
  return DETAIL_SPORTS[sport] ?? DETAIL_SPORTS.basketball;
}
