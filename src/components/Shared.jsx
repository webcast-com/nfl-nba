import React from "react";

export function BrandHeader({ sport }) {
  return <header className="sh-topbar">
    <div className="sh-brand">
      <div className="sh-logo">S</div>
      <div><div className="sh-brand-name">Score<span style={{color:"var(--sh-green)"}}>Hub</span></div><div className="sh-brand-sub">LIVE SPORTS</div></div>
    </div>
    <div className="sh-live-indicator"><i className="sh-dot" /> {sport.toUpperCase()} CENTER</div>
  </header>;
}

export function GameCard({ game }) {
  const live = game.status === "LIVE";
  return <article className="sh-game">
    <div className="sh-game-top"><span>{game.competition}</span><span className={`sh-status ${live ? "live" : ""}`}>{game.status === "UPCOMING" ? "UPCOMING" : game.status}</span></div>
    <div className="sh-team-row"><div className="sh-team-name"><span className="sh-crest">{game.homeCode}</span><span>{game.home}</span></div><strong className="sh-score">{game.homeScore ?? "—"}</strong></div>
    <div className="sh-team-row"><div className="sh-team-name"><span className="sh-crest">{game.awayCode}</span><span>{game.away}</span></div><strong className="sh-score">{game.awayScore ?? "—"}</strong></div>
    <div className="sh-game-foot"><span>{game.venue}</span><strong>{game.clock}</strong></div>
  </article>;
}

export function Panel({ title, note, children }) {
  return <section className="sh-panel"><div className="sh-panel-head"><div className="sh-panel-title">{title}</div>{note && <div className="sh-panel-note">{note}</div>}</div>{children}</section>;
}

export function StatsGrid({ stats }) {
  return <Panel title="Competition snapshot" note="Overview"><div className="sh-stats">{stats.map(s => <div className="sh-stat" key={s.label}><div className="sh-stat-label">{s.label}</div><div className="sh-stat-value">{s.value}</div><div className="sh-stat-foot">{s.foot}</div></div>)}</div></Panel>;
}

export function Leaders({ leaders, title = "Player leaders" }) {
  return <Panel title={title} note="Season leaders"><div className="sh-leaders">{leaders.map((p,i) => <div className="sh-leader" key={p.name}><div className="sh-leader-rank">{String(i+1).padStart(2,"0")}</div><div className="sh-avatar">{p.initials}</div><div className="sh-leader-info"><div className="sh-leader-name">{p.name}</div><div className="sh-leader-meta">{p.team} · {p.metric}</div></div><div className="sh-leader-value">{p.value}<small>{p.metric}</small></div></div>)}</div></Panel>;
}

export function StandingsTable({ groups, nfl = false }) {
  return <Panel title={nfl ? "Conference & division standings" : "League standings"} note="Sample table">
    {groups.map(group => <div key={group.group}>
      <div style={{padding:"12px 17px 5px",fontSize:11,fontWeight:800,color:"var(--sh-green)",letterSpacing:".5px"}}>{group.group}</div>
      <div className="sh-table-wrap"><table className="sh-table"><thead><tr><th>TEAM</th><th>GP</th><th>W</th><th>L</th>{nfl ? <th>T</th> : null}<th>{nfl ? "PCT" : "PCT"}</th>{nfl ? <><th>PF</th><th>PA</th></> : <><th>GB</th><th>STRK</th></>}</tr></thead>
      <tbody>{group.rows.map((r,i) => <tr key={r.code}><td><span className="sh-team-cell"><span className="sh-rank">{i+1}</span><span className="sh-mini-crest">{r.code}</span>{r.team}</span></td><td>{r.p}</td><td className="sh-positive">{r.w}</td><td>{r.l}</td>{nfl ? <td>{r.t}</td> : null}<td>{r.pct}</td>{nfl ? <><td>{r.pf}</td><td>{r.pa}</td></> : <><td>{r.gb}</td><td>{r.streak}</td></>}</tr>)}</tbody></table></div>
    </div>)}
  </Panel>;
}

export function FilterBar({ competitions, countries, competition, setCompetition, country, setCountry, status, setStatus, search, setSearch, extra }) {
  return <div className="sh-filters">
    <select className="sh-select" value={competition} onChange={e=>setCompetition(e.target.value)} aria-label="Filter competition"><option value="all">All competitions</option>{competitions.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>
    <select className="sh-select" value={country} onChange={e=>setCountry(e.target.value)} aria-label="Filter country"><option value="All countries">All countries</option>{countries.filter(c=>c!=="All countries").map(c=><option key={c}>{c}</option>)}</select>
    {extra}
    <input className="sh-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search teams or competitions..." aria-label="Search teams or competitions" />
    <div className="sh-tabs">{["ALL","LIVE","UPCOMING","FINAL"].map(s=><button key={s} onClick={()=>setStatus(s)} className={`sh-tab ${status===s?"active":""}`}>{s}</button>)}</div>
  </div>;
}

export function GamesPanel({ games, title = "Scores & fixtures" }) {
  return <Panel title={title} note={`${games.length} matches`}>
    {games.length ? <div className="sh-games">{games.map(g=><GameCard key={g.id} game={g}/>)}</div> : <div className="sh-empty">No matches match these filters.</div>}
    <div className="sh-footnote">Scores shown are demonstration data. Connect a verified sports data feed for live updates.</div>
  </Panel>;
}
