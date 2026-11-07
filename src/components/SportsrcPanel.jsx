import React, { useMemo, useState } from "react";
import { IconBall } from "./Icons";
import { MatchCard, StatusTabs } from "./Scoreboard";
import StreamOverlay from "./StreamOverlay";
import { EmptyState, Panel, PanelHead, RefreshButton, SourceChip } from "./ui";
import { sortByStatus } from "../utils/dashboard";

/** Most fixtures the endpoint can return in one feed (48 leagues). */
const SHOW_LIMIT = 24;

/**
 * Global-basketball fixtures panel fed by the Sportsrc `?type=matches`
 * endpoint. The cards reuse the existing `MatchCard`, but the games are
 * rendered without a link: Sportsrc ids have no ESPN commentary behind them,
 * so the detail screen would come up empty.
 *
 * Every fixture carries a Watch button: the matches feed only returns games
 * that have a stream, and opening one mounts the shared `StreamOverlay`
 * (see src/components/StreamOverlay.jsx) which fetches the match detail and
 * renders the `sources[].embedUrl` in an iframe.
 */
export default function SportsrcPanel({ feed, title = "Global basketball" }) {
  const [tab, setTab] = useState("ALL");
  const [watching, setWatching] = useState(null); // match being streamed

  const matches = useMemo(() => feed?.matches ?? [], [feed]);

  const visible = useMemo(() => {
    const pool = tab === "ALL" ? matches : matches.filter((game) => game.status === tab);
    return sortByStatus(pool);
  }, [matches, tab]);

  const shown = visible.slice(0, SHOW_LIMIT);
  const hidden = visible.length - shown.length;

  const openWatch = (match) => setWatching(match);

  const closeWatch = () => setWatching(null);

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
              <MatchCard key={game.id} game={game} onWatch={openWatch} />
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

      {watching ? <StreamOverlay match={watching} onClose={closeWatch} /> : null}
    </Panel>
  );
}
