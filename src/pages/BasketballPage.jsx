import React, { useMemo, useState } from "react";
import { basketballCompetitions as defaultCompetitions, basketballCountries as defaultCountries, basketballGames as defaultGames, basketballStandings as defaultStandings, basketballLeaders as defaultLeaders, basketballStats as defaultStats } from "../data/sportsData";
import { BrandHeader, FilterBar, GamesPanel, StandingsTable, Leaders, StatsGrid, Panel } from "../components/Shared";

export default function BasketballPage({
  games = defaultGames, competitions = defaultCompetitions, countries = defaultCountries,
  standings = defaultStandings, leaders = defaultLeaders, stats = defaultStats,
  lastUpdated = "Demo data · connect API for live updates"
}) {
  const [competition, setCompetition] = useState("all");
  const [country, setCountry] = useState("All countries");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All regions");

  const filtered = useMemo(() => games.filter(g =>
    (competition === "all" || g.competitionId === competition) &&
    (country === "All countries" || g.country === country) &&
    (region === "All regions" || competitions.find(c=>c.id===g.competitionId)?.region === region) &&
    (status === "ALL" || g.status === status) &&
    `${g.home} ${g.away} ${g.competition}`.toLowerCase().includes(search.toLowerCase())
  ), [games, competition, country, region, status, search, competitions]);

  return <main className="sh-page">
    <BrandHeader sport="Basketball"/>
    <div className="sh-heading"><div><div className="sh-eyebrow">Global basketball</div><h1 className="sh-title">Basketball Center</h1><div className="sh-subtitle">Follow leagues and competitions around the world — from the NBA and EuroLeague to African, Asian and national-team basketball.</div></div><div className="sh-updated">Updated: {lastUpdated}</div></div>
    <FilterBar competitions={competitions} countries={countries} competition={competition} setCompetition={setCompetition} country={country} setCountry={setCountry} status={status} setStatus={setStatus} search={search} setSearch={setSearch}
      extra={<select className="sh-select" value={region} onChange={e=>setRegion(e.target.value)} aria-label="Filter region"><option>All regions</option>{["Africa","Asia","Europe","North America","South America","Oceania"].map(r=><option key={r}>{r}</option>)}</select>}
    />
    <div className="sh-grid">
      <div className="sh-main-col">
        <GamesPanel games={filtered} title="Basketball scores & fixtures"/>
        <StandingsTable groups={standings}/>
      </div>
      <aside className="sh-side-col">
        <StatsGrid stats={stats}/>
        <Leaders leaders={leaders} title="Player statistics leaders"/>
        <Panel title="Competition coverage" note="Browse regions"><div className="sh-leaders">{["Africa · BAL, WBL Africa","Europe · EuroLeague, EuroCup, BCL","North America · NBA, WNBA, G League","Asia · CBA, B.LEAGUE, PBA","Oceania · NBL Australia"].map(x=><div className="sh-leader" key={x}><span className="sh-dot"/><div className="sh-leader-info"><div className="sh-leader-name">{x}</div><div className="sh-leader-meta">Competition directory category</div></div></div>)}</div></Panel>
      </aside>
    </div>
  </main>;
}
