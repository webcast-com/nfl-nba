import React, { useMemo, useState } from "react";
import { nflCompetitions as defaultCompetitions, nflCountries as defaultCountries, nflGames as defaultGames, nflStandings as defaultStandings, nflLeaders as defaultLeaders, nflStats as defaultStats } from "../data/sportsData";
import { BrandHeader, FilterBar, GamesPanel, StandingsTable, Leaders, StatsGrid, Panel } from "../components/Shared";

export default function NFLPage({
  games = defaultGames, competitions = defaultCompetitions, countries = defaultCountries,
  standings = defaultStandings, leaders = defaultLeaders, stats = defaultStats,
  lastUpdated = "Demo data · connect API for live updates"
}) {
  const [competition, setCompetition] = useState("all");
  const [country, setCountry] = useState("All countries");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [conference, setConference] = useState("All conferences");

  const filtered = useMemo(() => games.filter(g =>
    (competition === "all" || g.competitionId === competition) &&
    (country === "All countries" || (country === "International games" ? g.country !== "United States" : g.country === country)) &&
    (conference === "All conferences" || g.conference === conference) &&
    (status === "ALL" || g.status === status) &&
    `${g.home} ${g.away} ${g.competition}`.toLowerCase().includes(search.toLowerCase())
  ), [games, competition, country, conference, status, search]);

  return <main className="sh-page">
    <BrandHeader sport="NFL"/>
    <div className="sh-heading"><div><div className="sh-eyebrow">American football · United States</div><h1 className="sh-title">NFL Center</h1><div className="sh-subtitle">Track NFL matchups, AFC and NFC standings, weekly fixtures, playoff races and player performance.</div></div><div className="sh-updated">Updated: {lastUpdated}</div></div>
    <FilterBar competitions={competitions} countries={countries} competition={competition} setCompetition={setCompetition} country={country} setCountry={setCountry} status={status} setStatus={setStatus} search={search} setSearch={setSearch}
      extra={<select className="sh-select" value={conference} onChange={e=>setConference(e.target.value)} aria-label="Filter conference"><option>All conferences</option><option>AFC</option><option>NFC</option></select>}
    />
    <div className="sh-grid">
      <div className="sh-main-col">
        <GamesPanel games={filtered} title="NFL scores & fixtures"/>
        <StandingsTable groups={standings} nfl/>
      </div>
      <aside className="sh-side-col">
        <StatsGrid stats={stats}/>
        <Leaders leaders={leaders} title="Player statistics leaders"/>
        <Panel title="NFL structure" note="League format"><div className="sh-stats">
          {[["AFC","16 teams"],["NFC","16 teams"],["Divisions","8 total"],["Teams / division","4 each"]].map(([a,b])=><div className="sh-stat" key={a}><div className="sh-stat-label">{a}</div><div className="sh-stat-value">{b}</div><div className="sh-stat-foot">NFL competition structure</div></div>)}
        </div><div className="sh-footnote">NFL regular season, playoffs and Super Bowl are stages/events within the NFL, not separate professional leagues.</div></Panel>
      </aside>
    </div>
  </main>;
}
