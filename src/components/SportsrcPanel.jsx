import React, { useMemo, useState } from "react";
import { IconBall } from "./Icons";
import { MatchCard, StatusTabs } from "./Scoreboard";
import { EmptyState, Panel, PanelHead, RefreshButton, SourceChip } from "./ui";
import { sortByStatus } from "../utils/dashboard";

/** Most fixtures the endpoint can return in one feed (48 leagues). */
const SHOW_LIMIT = 24;

/**
 * Global-basketball fixtures panel fed by the Sportsrc `?type=matches`
 * endpoint. The cards reuse the existing `MatchCard`, but the games are
 * rendered without a link: Sportsrc ids have no ESPN commentary behind them,
 * so the detail screen would come up empty.
 */
export default function SportsrcPanel({ feed, title = "Global basketball" }) {
  const [tab, setTab] = useState("ALL");
  const matches = useMemo(() => feed?.matches ?? [], [feed]);

  const visible = useMemo(() => {
    const pool = tab === "ALL" ? matches : matches.filter((game) => game.status === tab);
    return sortByStatus(pool);
  }, [matches, tab]);

  const shown = visible.slice(0, SHOW_LIMIT);
  const hidden = visible.length - shown.length;

  return (
    <Panel className="sh-sportsrc-panel" id="section-sportsrc">
      <PanelHead
        icon={<IconBall size={15} />}
        title={`${title} · Sportsrc`}
        note={matches.length ? `${matches.length} fixtures` : undefined}
        actions={
          <>
            <SourceChip status={feed?.status ?? "demo"} label={feed?.badge ?? "SPORTSRC"} />
            {feed?.refresh ? (
              <RefreshButton
                onClick={feed.refresh}
                refreshing={feed.refreshing}
                ariaLabel="Refresh Sportsrc data"
                title="Refresh Sportsrc data"
              />
            ) : null}
          </>
        }
      />

      <div className="sh-score-bar">
        <StatusTabs value={tab} onChange={setTab} />
      </div>

      {shown.length ? (
        <>
          <div className="sh-matches">
            {shown.map((game) => (
              <MatchCard key={game.id} game={game} />
            ))}
          </div>
          {hidden > 0 ? (
            <p className="sh-panel-note">Showing the first {SHOW_LIMIT} of {visible.length} fixtures.</p>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="No fixtures from Sportsrc"
          hint={feed?.error ?? feed?.label ?? "The feed will appear once Sportsrc answers."}
        />
      )}
    </Panel>
  );
}
