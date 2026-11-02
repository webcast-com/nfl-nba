import React, { useMemo, useState } from "react";
import { nflCompetitions as defaultCompetitions, nflCountries as defaultCountries } from "../data/sportsData";
import { BrandHeader, FilterBar, GamesPanel, StandingsTable, Leaders, StatsGrid, Panel, DataStatus } from "../components/Shared";
import { useEspnFeed } from "../hooks/useEspnFeed";

const MAX_WEEKS = { 1: 4, 2: 18, 3: 5 };
const SEASON_TYPES = [
  { value: 1, label: "Preseason" },
  { value: 2, label: "Regular season" },
  { value: 3, label: "Postseason" },
];

export default function NFLPage({
  games, competitions = defaultCompetitions, countries = defaultCountries,
  standings, leaders, stats,
  lastUpdated,
  live = true
}) {
  const [competition, setCompetition] = useState("all");
  const [country, setCountry] = useState("All countries");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [conference, setConference] = useState("All conferences");
  const [seasonType, setSeasonType] = useState(2);
  const [week, setWeek] = useState(null);

  const isControlled = Boolean(games || standings || leaders || stats);
  const feed = useEspnFeed({ sport: "football", enabled: live && !isControlled, week: week ?? undefined, seasonType });

  const activeGames = games ?? feed.games;
  const activeStandings = standings ?? feed.standings;
  const activeLeaders = leaders ?? feed.leaders;
  const activeStats = stats ?? feed.stats;
  const source = games ? "demo" : feed.source;
  const updated = lastUpdated ?? (isControlled ? "custom dataset" : feed.label);

  const maxWeek = MAX_WEEKS[seasonType] ?? 18;
  const currentWeek = Math.min(Math.max(week ?? feed.meta?.week ?? 1, 1), maxWeek);
  const stepWeek = (delta) => setWeek(Math.min(Math.max(currentWeek + delta, 1), maxWeek));

  const filtered = useMemo(() => activeGames.filter(g =>
    (competition === "all" || g.competitionId === competition) &&
    (country === "All countries" || (country === "International games" ? g.country !== "United States" : g.country === country)) &&
    (conference === "All conferences" || g.conference === conference) &&
    (status === "ALL" || g.status === status) &&
    `${g.home} ${g.away} ${g.competition}`.toLowerCase().includes(search.toLowerCase())
  ), [activeGames, competition, country, conference, status, search]);

  const weekLabel = `Week ${currentWeek}`;

  return <main className="sh-page">
    <BrandHeader sport="NFL"/>
    <div className="sh-heading"><div><div className="sh-eyebrow">American football · United States</div><h1 className="sh-title">NFL Center</h1><div className="sh-subtitle">Track NFL matchups, AFC and NFC standings, weekly fixtures, playoff races and player performance.</div></div><div className="sh-meta"><DataStatus status={isControlled ? "custom" : feed.status} label={isControlled ? "CUSTOM DATA" : feed.badge} onRefresh={isControlled ? undefined : feed.refresh} refreshing={feed.refreshing} /><div className="sh-updated">Updated: {updated}</div></div></div>
    <FilterBar competitions={competitions} countries={countries} competition={competition} setCompetition={setCompetition} country={country} setCountry={setCountry} status={status} setStatus={setStatus} search={search} setSearch={setSearch}
      extra={<>
        <div className="sh-stepper" role="group" aria-label="Season week">
          <button type="button" className="sh-step" onClick={() => stepWeek(-1)} aria-label="Previous week">‹</button>
          <span className="sh-step-label">{weekLabel}</span>
          <button type="button" className="sh-step" onClick={() => stepWeek(1)} aria-label="Next week">›</button>
          <button type="button" className="sh-step-today" onClick={() => setWeek(null)}>Current</button>
        </div>
        <select className="sh-select" value={seasonType} onChange={e => { setSeasonType(Number(e.target.value)); setWeek(null); }} aria-label="Filter season stage">
          {SEASON_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select className="sh-select" value={conference} onChange={e=>setConference(e.target.value)} aria-label="Filter conference"><option>All conferences</option><option>AFC</option><option>NFC</option></select>
      </>}
    />
    <div className="sh-grid">
      <div className="sh-main-col">
        <GamesPanel games={filtered} title="NFL scores & fixtures" source={source}/>
        <StandingsTable groups={activeStandings} nfl note={source === "espn" ? "ESPN standings" : "Sample table"}/>
      </div>
      <aside className="sh-side-col">
        <StatsGrid stats={activeStats}/>
        <Leaders leaders={activeLeaders} title="Player statistics leaders"/>
        <Panel title="NFL structure" note="League format"><div className="sh-stats">
          {[["AFC","16 teams"],["NFC","16 teams"],["Divisions","8 total"],["Teams / division","4 each"]].map(([a,b])=><div className="sh-stat" key={a}><div className="sh-stat-label">{a}</div><div className="sh-stat-value">{b}</div><div className="sh-stat-foot">NFL competition structure</div></div>)}
        </div><div className="sh-footnote">NFL regular season, playoffs and Super Bowl are stages/events within the NFL, not separate professional leagues.</div></Panel>
      </aside>
    </div>
  </main>;
}
