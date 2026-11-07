import React, { useMemo, useState } from "react";
import {
  soccerCompetitions as defaultCompetitions,
  soccerCountries as defaultCountries,
} from "../data/sportsData";
import { LeagueSidebar } from "../components/LeagueSidebar";
import { MobileSectionTabs } from "../components/Shell";
import { FeaturedGame, ScoreboardPanel } from "../components/Scoreboard";
import { PlayerDetails } from "../components/PlayerDetails";
import { StandingsPanel, StatTiles } from "../components/Standings";
import { usePageMeta } from "../hooks/usePageMeta";
import { useEspnFeed } from "../hooks/useEspnFeed";
import { toDateKey } from "../utils/dates";
import {
  buildTeamLogoMap,
  competitionColors,
  featuredGame,
  seasonLabelFor,
  sortByStatus,
} from "../utils/dashboard";

/** Countries whose leagues the hub tracks; everything else counts as "International". */
const HUB_COUNTRIES = ["United Kingdom", "Spain", "Italy", "Germany"];

export default function SoccerPage({
  games,
  competitions = defaultCompetitions,
  countries = defaultCountries,
  standings,
  leaders,
  stats,
  lastUpdated,
  live = true,
}) {
  usePageMeta(
    "Football (soccer)",
    "Live football (soccer) scores, fixtures and standings from the Premier League, La Liga, Serie A, the Bundesliga and the Champions League."
  );
  const [competition, setCompetition] = useState("all");
  const [country, setCountry] = useState("All countries");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const isControlled = Boolean(games || standings || leaders || stats);
  // Soccer boards run on the calendar day, so the feed asks for today's
  // fixtures and carries over any match still in progress from yesterday.
  const feed = useEspnFeed({
    sport: "soccer",
    enabled: live && !isControlled,
    date: toDateKey(),
    competition,
  });

  const activeGames = games ?? feed.games;
  const activeStandings = standings ?? feed.standings;
  const activeLeaders = leaders ?? feed.leaders;
  const activeStats = stats ?? feed.stats;
  const source = games ? "demo" : feed.source;
  const updated = lastUpdated ?? (isControlled ? "custom dataset" : feed.label);

  const leagueColors = useMemo(() => competitionColors(competitions), [competitions]);

  const filtered = useMemo(
    () =>
      sortByStatus(
        activeGames
          .filter(
            (game) =>
              (competition === "all" || game.competitionId === competition) &&
              (country === "All countries" ||
                (country === "International games"
                  ? !HUB_COUNTRIES.includes(game.country)
                  : game.country === country)) &&
              (status === "ALL" || game.status === status) &&
              `${game.home} ${game.away} ${game.competition}`
                .toLowerCase()
                .includes(search.toLowerCase())
          )
          .map((game) => ({ ...game, leagueColor: leagueColors[game.competitionId] }))
      ),
    [activeGames, competition, country, status, search, leagueColors]
  );

  const hero = useMemo(() => featuredGame(filtered), [filtered]);
  const logoMap = useMemo(
    () => buildTeamLogoMap(activeGames, activeStandings),
    [activeGames, activeStandings]
  );

  const playerCards = useMemo(
    () =>
      activeLeaders.map((player) => ({
        ...player,
        teamLogo: player.teamLogo ?? logoMap[player.team],
      })),
    [activeLeaders, logoMap]
  );

  const groups = [
    {
      title: "Leagues",
      items: countries
        .filter((entry) => entry !== "All countries" && entry !== "International games")
        .map((entry) => ({
          key: entry,
          label: entry,
          active: country === entry,
          onClick: () => setCountry((current) => (current === entry ? "All countries" : entry)),
          ariaLabel: `Country: ${entry}`,
        })),
    },
  ];

  const handleLeague = (id) => {
    setCompetition((current) => (current === id ? "all" : id));
  };

  return (
    <main className="sh-dash">
      <h1 className="sh-sr-only">Football (Soccer) Center</h1>

      <LeagueSidebar
        title="Competition"
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
        <div id="section-live">
          <FeaturedGame game={hero} sport="football" />
        </div>

        <ScoreboardPanel
          games={filtered}
          note={`${filtered.length} matches`}
          seasonLabel={seasonLabelFor("soccer", feed.meta)}
          status={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
          sourceStatus={isControlled ? "custom" : feed.status}
          sourceLabel={isControlled ? "CUSTOM DATA" : feed.badge}
          onRefresh={isControlled ? undefined : feed.refresh}
          refreshing={feed.refreshing}
          matchBasePath="/soccer"
          emptyHint="No matches for these filters today."
        />

        <div id="section-standings">
          <StandingsPanel
            groups={activeStandings}
            soccer
            note={source === "espn" ? "ESPN standings" : "Sample tables"}
            teamBasePath="/soccer"
          />
        </div>
        <p className="sh-updated">Updated: {updated}</p>
      </div>

      <aside className="sh-right" id="section-players">
        <PlayerDetails
          linkBase="/soccer"
          viewAllHref="/soccer/top-scorers"
          leaders={playerCards}
          note="Season leaders"
        />
        <StatTiles stats={activeStats} title="Matchday snapshot" note="Live matches on the board" />
      </aside>

      <MobileSectionTabs />
    </main>
  );
}
