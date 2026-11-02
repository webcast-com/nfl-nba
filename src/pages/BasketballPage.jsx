import React, { useMemo, useState } from "react";
import {
  basketballCompetitions as defaultCompetitions,
  basketballCountries as defaultCountries,
} from "../data/sportsData";
import { LeagueSidebar } from "../components/LeagueSidebar";
import { DateRail, FeaturedGame, ScoreboardPanel } from "../components/Scoreboard";
import { PlayerDetails } from "../components/PlayerDetails";
import { StandingsPanel, StatTiles } from "../components/Standings";
import { useEspnFeed } from "../hooks/useEspnFeed";
import { buildDateRail, formatDateKeyLabel, toDateKey } from "../utils/dates";
import {
  buildTeamLogoMap,
  competitionColors,
  featuredGame,
  seasonLabelFor,
} from "../utils/dashboard";

const REGIONS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];

export default function BasketballPage({
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
  const [region, setRegion] = useState("All regions");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => toDateKey());

  const isControlled = Boolean(games || standings || leaders || stats);
  const feed = useEspnFeed({ sport: "basketball", enabled: live && !isControlled, date });

  // Explicit props always win, so the page stays usable as a pure component.
  const activeGames = games ?? feed.games;
  const activeStandings = standings ?? feed.standings;
  const activeLeaders = leaders ?? feed.leaders;
  const activeStats = stats ?? feed.stats;
  const source = games ? "demo" : feed.source;
  const updated = lastUpdated ?? (isControlled ? "custom dataset" : feed.label);

  const leagueColors = useMemo(() => competitionColors(competitions), [competitions]);

  const filtered = useMemo(
    () =>
      activeGames
        .filter(
          (game) =>
            (competition === "all" || game.competitionId === competition) &&
            (country === "All countries" || game.country === country) &&
            (region === "All regions" ||
              competitions.find((entry) => entry.id === game.competitionId)?.region === region) &&
            (status === "ALL" || game.status === status) &&
            `${game.home} ${game.away} ${game.competition}`
              .toLowerCase()
              .includes(search.toLowerCase())
        )
        .map((game) => ({ ...game, leagueColor: leagueColors[game.competitionId] })),
    [activeGames, competition, country, region, status, search, competitions, leagueColors]
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

  const dateRail = useMemo(() => buildDateRail(date), [date]);
  const today = toDateKey();

  const leagueList = competitions.map((entry) => ({
    id: entry.id,
    name: entry.name,
    short: entry.short,
    color: entry.color,
  }));

  const groups = [
    {
      title: "International",
      items: countries
        .filter((entry) => entry !== "All countries")
        .map((entry) => ({
          key: entry,
          label: entry,
          active: country === entry,
          onClick: () => setCountry((current) => (current === entry ? "All countries" : entry)),
        })),
    },
    {
      title: "Regions",
      items: [
        {
          key: "All regions",
          label: "All regions",
          active: region === "All regions",
          onClick: () => setRegion("All regions"),
        },
        ...REGIONS.map((entry) => ({
          key: entry,
          label: entry,
          active: region === entry,
          onClick: () => setRegion((current) => (current === entry ? "All regions" : entry)),
        })),
      ],
    },
  ];

  return (
    <main className="sh-dash">
      <h1 className="sh-sr-only">Basketball Center</h1>

      <LeagueSidebar
        title="Popular Leagues"
        leagues={leagueList}
        activeLeague={competition}
        onLeague={(id) => setCompetition((current) => (current === id ? "all" : id))}
        groups={groups}
      />

      <div className="sh-center">
        <FeaturedGame game={hero} sport="basketball" />

        <ScoreboardPanel
          games={filtered}
          note={`${filtered.length} matches`}
          seasonLabel={seasonLabelFor("basketball", feed.meta)}
          rail={<DateRail items={dateRail} activeKey={date} onSelect={setDate} label="Scoreboard date" />}
          railReset={date === today ? undefined : { label: "Today", onClick: () => setDate(today) }}
          status={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
          sourceStatus={isControlled ? "custom" : feed.status}
          sourceLabel={isControlled ? "CUSTOM DATA" : feed.badge}
          onRefresh={isControlled ? undefined : feed.refresh}
          refreshing={feed.refreshing}
          emptyHint={`No games on ${formatDateKeyLabel(date)} for these filters.`}
        />

        <StandingsPanel
          groups={activeStandings}
          note={source === "espn" ? "ESPN standings" : "Sample table"}
        />
        <p className="sh-updated">Updated: {updated}</p>
      </div>

      <aside className="sh-right">
        <PlayerDetails
          leaders={playerCards}
          note={source === "espn" ? "ESPN leaders" : "Demo leaders"}
        />
        <StatTiles stats={activeStats} title="Competition snapshot" />
      </aside>
    </main>
  );
}
