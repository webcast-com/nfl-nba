import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { detailSport } from "../data/detailConfig";
import { demoCommentary } from "../data/commentaryData";
import { isEspnDisabled, loadMatchSummary } from "../api/espn";
import { gameClockLabel } from "../utils/dates";
import { EmptyState, Panel, PanelHead, TeamLogo } from "../components/ui";
import { IconClock, IconPlay } from "../components/Icons";

function findDemoGame(games, matchId) {
  return games.find((game) => String(game.id) === String(matchId)) ?? null;
}

export default function MatchPage({ sport = "basketball" }) {
  const config = detailSport(sport);
  const { matchId } = useParams();
  const demoGame = findDemoGame(config.games, matchId);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    setSummary(null);
    if (isEspnDisabled()) return undefined;
    let active = true;
    loadMatchSummary(config.leagueKey, matchId)
      .then((payload) => {
        if (active && payload.plays.length) setSummary(payload);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [config.leagueKey, matchId]);

  const home =
    summary?.teams?.find((team) => team.homeAway === "home") ?? summary?.teams?.[0] ?? null;
  const away =
    summary?.teams?.find((team) => team.homeAway === "away") ?? summary?.teams?.[1] ?? null;

  const teams = {
    home: demoGame
      ? { name: demoGame.home, code: demoGame.homeCode, logo: demoGame.homeLogo, score: demoGame.homeScore }
      : home,
    away: demoGame
      ? { name: demoGame.away, code: demoGame.awayCode, logo: demoGame.awayLogo, score: demoGame.awayScore }
      : away,
  };

  const status = demoGame
    ? demoGame.status === "FINAL"
      ? "Final"
      : demoGame.clock || gameClockLabel(demoGame)
    : summary?.period ?? null;

  const plays = summary?.plays?.length
    ? summary.plays
    : demoCommentary[String(matchId)]?.plays ?? [];

  if (!demoGame && !summary) {
    return (
      <main className="sh-detail">
        <nav className="sh-crumbs" aria-label="Breadcrumb">
          <Link to={config.hub}>{config.hubLabel}</Link>
          <span aria-hidden="true">/</span>
          <span>Match</span>
        </nav>
        <EmptyState
          title="We couldn't find that match"
          hint="Open a game from the live score rail so its commentary can load."
        />
        <Link className="sh-detail-back" to={config.hub}>
          Back to {config.hubLabel}
        </Link>
      </main>
    );
  }

  return (
    <main className="sh-detail">
      <nav className="sh-crumbs" aria-label="Breadcrumb">
        <Link to={config.hub}>{config.hubLabel}</Link>
        <span aria-hidden="true">/</span>
        <span>{config.label}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Match commentary</span>
      </nav>

      <header className="sh-detail-hero sh-match-hero">
        <div className="sh-match-team">
          <TeamLogo src={teams.home?.logo} code={teams.home?.code} size="lg" />
          <div>
            <b>{teams.home?.name ?? "TBD"}</b>
            <i>Home</i>
          </div>
          <span className="sh-match-score">{teams.home?.score ?? "—"}</span>
        </div>

        <div className="sh-match-mid">
          <span className={`sh-detail-chip ${demoGame?.status === "LIVE" ? "is-live" : "is-soon"}`}>
            {status ?? "Scheduled"}
          </span>
          <span className="sh-match-venue">{demoGame?.venue ?? summary?.venue ?? ""}</span>
        </div>

        <div className="sh-match-team is-away">
          <span className="sh-match-score">{teams.away?.score ?? "—"}</span>
          <div>
            <b>{teams.away?.name ?? "TBD"}</b>
            <i>Away</i>
          </div>
          <TeamLogo src={teams.away?.logo} code={teams.away?.code} size="lg" />
        </div>
      </header>

      <Panel className="sh-detail-panel">
        <PanelHead
          icon={<IconPlay size={15} />}
          title="Commentary"
          note={summary?.plays?.length ? "ESPN play-by-play" : plays.length ? "Sample play-by-play" : undefined}
        />
        {plays.length ? (
          <ol className="sh-commentary">
            {plays.map((play, index) => (
              <li key={`${play.clock}-${index}`}>
                <span className="sh-commentary-clock">
                  <IconClock size={12} />
                  {play.clock}
                </span>
                <span className="sh-commentary-text">
                  {play.team ? <b>{play.team}</b> : null}
                  {play.text}
                </span>
                {play.score ? <span className="sh-commentary-score">{play.score}</span> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="sh-detail-note">
            Play-by-play appears once ESPN publishes the commentary feed for this game.
          </p>
        )}
      </Panel>
    </main>
  );
}
