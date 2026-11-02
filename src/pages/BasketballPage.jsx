import React, { useMemo, useState } from "react";
import { basketballCompetitions as defaultCompetitions, basketballCountries as defaultCountries } from "../data/sportsData";
import { BrandHeader, FilterBar, GamesPanel, StandingsTable, Leaders, StatsGrid, Panel, DataStatus } from "../components/Shared";
import { useEspnFeed } from "../hooks/useEspnFeed";
import { formatDateKeyLabel, shiftDateKey, toDateKey } from "../utils/dates";

export default function BasketballPage({
  games, competitions = defaultCompetitions, countries = defaultCountries,
  standings, leaders, stats,
  lastUpdated,
  live = true
}) {
  const [competition, setCompetition] = useState("all");
  const [country, setCountry] = useState("All countries");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All regions");
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

  const filtered = useMemo(() => activeGames.filter(g =>
    (competition === "all" || g.competitionId === competition) &&
    (country === "All countries" || g.country === country) &&
    (region === "All regions" || competitions.find(c=>c.id===g.competitionId)?.region === region) &&
    (status === "ALL" || g.status === status) &&
    `${g.home} ${g.away} ${g.competition}`.toLowerCase().includes(search.toLowerCase())
  ), [activeGames, competition, country, region, status, search, competitions]);

  return <main className="sh-page">
    <BrandHeader sport="Basketball"/>
    <div className="sh-heading"><div><div className="sh-eyebrow">Global basketball</div><h1 className="sh-title">Basketball Center</h1><div className="sh-subtitle">Follow leagues and competitions around the world — from the NBA and EuroLeague to African, Asian and national-team basketball.</div></div><div className="sh-meta"><DataStatus status={isControlled ? "custom" : feed.status} label={isControlled ? "CUSTOM DATA" : feed.badge} onRefresh={isControlled ? undefined : feed.refresh} refreshing={feed.refreshing} /><div className="sh-updated">Updated: {updated}</div></div></div>
    <FilterBar competitions={competitions} countries={countries} competition={competition} setCompetition={setCompetition} country={country} setCountry={setCountry} status={status} setStatus={setStatus} search={search} setSearch={setSearch}
      extra={<>
        <div className="sh-stepper" role="group" aria-label="Scoreboard date">
          <button type="button" className="sh-step" onClick={() => setDate(current => shiftDateKey(current, -1))} aria-label="Previous day">‹</button>
          <span className="sh-step-label">{formatDateKeyLabel(date)}</span>
          <button type="button" className="sh-step" onClick={() => setDate(current => shiftDateKey(current, 1))} aria-label="Next day">›</button>
          <button type="button" className="sh-step-today" onClick={() => setDate(toDateKey())}>Today</button>
        </div>
        <select className="sh-select" value={region} onChange={e=>setRegion(e.target.value)} aria-label="Filter region"><option>All regions</option>{["Africa","Asia","Europe","North America","South America","Oceania"].map(r=><option key={r}>{r}</option>)}</select>
      </>}
    />
    <div className="sh-grid">
      <div className="sh-main-col">
        <GamesPanel games={filtered} title="Basketball scores & fixtures" source={source}/>
        <StandingsTable groups={activeStandings} note={source === "espn" ? "ESPN standings" : "Sample table"}/>
      </div>
      <aside className="sh-side-col">
        <StatsGrid stats={activeStats}/>
        <Leaders leaders={activeLeaders} title="Player statistics leaders"/>
        <Panel title="Competition coverage" note="Browse regions"><div className="sh-leaders">{["Africa · BAL, WBL Africa","Europe · EuroLeague, EuroCup, BCL","North America · NBA, WNBA, G League","Asia · CBA, B.LEAGUE, PBA","Oceania · NBL Australia"].map(x=><div className="sh-leader" key={x}><span className="sh-dot"/><div className="sh-leader-info"><div className="sh-leader-name">{x}</div><div className="sh-leader-meta">Competition directory category</div></div></div>)}</div></Panel>
      </aside>
    </div>
  </main>;
}
