import React, { useMemo, useState } from "react";
import {
  nflCompetitions as defaultCompetitions,
  nflCountries as defaultCountries,
} from "../data/sportsData";
import { LeagueSidebar } from "../components/LeagueSidebar";
import { DateRail, FeaturedGame, ScoreboardPanel } from "../components/Scoreboard";
import { PlayerDetails } from "../components/PlayerDetails";
import { StandingsPanel, StatTiles } from "../components/Standings";
import { useEspnFeed } from "../hooks/useEspnFeed";
import { buildWeekRail } from "../utils/dates";
import {
  buildTeamLogoMap,
  competitionColors,
  featuredGame,
  seasonLabelFor,
} from "../utils/dashboard";

const MAX_WEEKS = { 1: 4, 2: 18, 3: 5 };
const SEASON_TYPE_BY_COMPETITION = { nfl: 2, preseason: 1, playoffs: 3 };

export default function NFLPage({
  games,
  competitions = defaultCompetitions,
  countries = defaultCountries,
  standings,
  leaders,
  stats,
  lastUpdated,
  live = true,
}) {
  const [competition, setCompetition] = useState("all");
  const [country, setCountry] = useState("All countries");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [conference, setConference] = useState("All conferences");
  const [seasonType, setSeasonType] = useState(2);
  const [week, setWeek] = useState(null);

  const isControlled = Boolean(games || standings || leaders || stats);
  const feed = useEspnFeed({
    sport: "football",
    enabled: live && !isControlled,
    week: week ?? undefined,
    seasonType,
  });

  const activeGames = games ?? feed.games;
  const activeStandings = standings ?? feed.standings;
  const activeLeaders = leaders ?? feed.leaders;
  const activeStats = stats ?? feed.stats;
  const source = games ? "demo" : feed.source;
  const updated = lastUpdated ?? (isControlled ? "custom dataset" : feed.label);

  const leagueColors = useMemo(() => competitionColors(competitions), [competitions]);
  const maxWeek = MAX_WEEKS[seasonType] ?? 18;
  const currentWeek = Math.min(Math.max(week ?? feed.meta?.week ?? 1, 1), maxWeek);

  const filtered = useMemo(
    () =>
      activeGames
        .filter(
          (game) =>
            (competition === "all" || game.competitionId === competition) &&
            (country === "All countries" ||
              (country === "International games"
                ? game.country !== "United States"
                : game.country === country)) &&
            (conference === "All conferences" || game.conference === conference) &&
            (status === "ALL" || game.status === status) &&
            `${game.home} ${game.away} ${game.competition}`
              .toLowerCase()
              .includes(search.toLowerCase())
        )
        .map((game) => ({ ...game, leagueColor: leagueColors[game.competitionId] })),
    [activeGames, competition, country, conference, status, search, leagueColors]
  );

  const hero = useMemo(() => featuredGame(filtered), [filtered]);
  const logoMap = useMemo(
    () => buildTeamLogoMap(activeGames, activeStandings),
    [activeGames, activeStandings]
  );

  const playerCards = useMemo(
    () => activeLeaders.map((player) => ({ ...player, teamLogo: player.teamLogo ?? logoMap[player.team] })),
    [activeLeaders, logoMap]
  );

  const weekRail = useMemo(() => buildWeekRail(maxWeek), [maxWeek]);

  const handleLeague = (id) => {
    if (competition === id) {
      setCompetition("all");
      setSeasonType(2);
      setWeek(null);
      return;
    }
    setCompetition(id);
    setSeasonType(SEASON_TYPE_BY_COMPETITION[id] ?? 2);
    setWeek(null);
  };

  const groups = [
    {
      title: "Conference",
      items: ["All conferences", "AFC", "NFC"].map((entry) => ({
        key: entry,
        label: entry,
        badge: entry === "All conferences" ? "ALL" : entry,
        color: entry === "AFC" ? "#c2410c" : entry === "NFC" ? "#1d4ed8" : "#475569",
        active: conference === entry,
        onClick: () => setConference(entry),
        ariaLabel: `Conference: ${entry}`,
      })),
    },
    {
      title: "International",
      items: countries
        .filter((entry) => entry !== "All countries")
        .map((entry) => ({
          key: entry,
          label: entry,
          active: country === entry,
          onClick: () => setCountry((current) => (current === entry ? "All countries" : entry)),
          ariaLabel: `Country: ${entry}`,
        })),
    },
  ];

  return (
    <main className="sh-dash">
      <h1 className="sh-sr-only">NFL Center</h1>

      <LeagueSidebar
        title="Season stage"
        leagues={competitions.map((entry) => ({
          id: entry.id,
          name: entry.name,
          short: entry.short,
          color: entry.color,
        }))}
        activeLeague={competition}
        onLeague={handleLeague}
        groups={groups}
      />

      <div className="sh-center">
        <FeaturedGame game={hero} sport="football" />

        <ScoreboardPanel
          games={filtered}
          note={`${filtered.length} matches`}
          seasonLabel={seasonLabelFor("football", feed.meta)}
          rail={
            <DateRail
              items={weekRail}
              activeKey={String(currentWeek)}
              onSelect={(key) => setWeek(Number(key))}
              label="Season week"
            />
          }
          railReset={week === null ? undefined : { label: "This week", onClick: () => setWeek(null) }}
          status={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
          sourceStatus={isControlled ? "custom" : feed.status}
          sourceLabel={isControlled ? "CUSTOM DATA" : feed.badge}
          onRefresh={isControlled ? undefined : feed.refresh}
          refreshing={feed.refreshing}
          emptyHint={`No games in week ${currentWeek} for these filters.`}
        />

        <StandingsPanel
          groups={activeStandings}
          nfl
          note={source === "espn" ? "ESPN standings" : "Sample table"}
        />
        <p className="sh-updated">Updated: {updated}</p>
      </div>

      <aside className="sh-right">
        <PlayerDetails
          leaders={playerCards}
          note={source === "espn" ? "ESPN leaders" : "Demo leaders"}
        />
        <StatTiles stats={activeStats} title="League format" note="NFL structure" />
      </aside>
    </main>
  );
}
