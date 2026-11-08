import React from "react";
import { slugify } from "../utils/entities";
import { IconTrophy } from "./Icons";
import { MaybeLink, Panel, PanelHead, TeamLogo } from "./ui";

export function StandingsPanel({ groups = [], nfl = false, soccer = false, note = "Sample table", teamBasePath }) {
  return (
    <Panel className="sh-standings-panel">
      <PanelHead
        icon={<IconTrophy size={15} />}
        title={nfl ? "Conference & division standings" : soccer ? "League table" : "League standings"}
        note={note}
      />

      <div className="sh-standings-grid">
        {groups.map((group) => (
          <div className="sh-standings-card" key={group.group}>
            <div className="sh-standings-title">
              {group.leagueLogo ? (
                <img className="sh-standings-logo" src={group.leagueLogo} alt="" loading="lazy" />
              ) : null}
              {group.group}
            </div>
            <div className="sh-table-wrap">
              <table className="sh-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    {soccer ? <th>D</th> : null}
                    {!soccer && nfl ? <th>T</th> : null}
                    <th>L</th>
                    <th>PCT</th>
                    {soccer ? (
                      <>
                        <th>GF</th>
                        <th>GA</th>
                        <th>PTS</th>
                      </>
                    ) : nfl ? (
                      <>
                        <th>PF</th>
                        <th>PA</th>
                      </>
                    ) : (
                      <>
                        <th>GB</th>
                        <th>STRK</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, index) => (
                    <tr key={row.code}>
                      <td>
                        <span className="sh-team-cell">
                          <span className="sh-rank">{index + 1}</span>
                          <TeamLogo src={row.logo} code={row.code} size="xs" />
                          {teamBasePath ? (
                            <MaybeLink
                              className="sh-team-name-cell sh-team-link"
                              to={`${teamBasePath}/team/${slugify(row.team)}`}
                              title={row.team}
                            >
                              {row.team}
                            </MaybeLink>
                          ) : (
                            <span className="sh-team-name-cell" title={row.team}>{row.team}</span>
                          )}
                        </span>
                      </td>
                      <td>{row.p}</td>
                      <td className="sh-positive">{row.w}</td>
                      {soccer ? <td>{row.t}</td> : null}
                      {!soccer && nfl ? <td>{row.t}</td> : null}
                      <td>{row.l}</td>
                      <td>{row.pct}</td>
                      {soccer ? (
                        <>
                          <td>{row.pf}</td>
                          <td>{row.pa}</td>
                          <td className="sh-positive">{row.pts}</td>
                        </>
                      ) : nfl ? (
                        <>
                          <td>{row.pf}</td>
                          <td>{row.pa}</td>
                        </>
                      ) : (
                        <>
                          <td>{row.gb}</td>
                          <td>{row.streak}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function StatTiles({ stats = [], title = "Competition snapshot", note = "Overview" }) {
  return (
    <Panel className="sh-stats-panel">
      <PanelHead title={title} note={note} />
      <div className="sh-stat-grid">
        {stats.map((stat) => (
          <div className="sh-stat" key={stat.label}>
            <span className="sh-stat-label">{stat.label}</span>
            <span className="sh-stat-value">{stat.value}</span>
            <span className="sh-stat-foot">{stat.foot}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
