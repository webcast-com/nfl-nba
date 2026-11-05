import React, { useEffect, useMemo, useState } from "react";
import { IconBall } from "./Icons";
import { MatchCard, StatusTabs } from "./Scoreboard";
import { EmptyState, Panel, PanelHead, RefreshButton, SourceChip } from "./ui";
import { loadMatchDetail } from "../api/sportsrc";
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
 * that have a stream, and opening one fetches the match detail
 * (`?type=detail&id=…`) whose `sources[].embedUrl` is rendered in an iframe
 * — the API docs require standard permissions and forbid `sandbox`.
 */
export default function SportsrcPanel({ feed, title = "Global basketball" }) {
  const [tab, setTab] = useState("ALL");
  const [watching, setWatching] = useState(null); // match being streamed
  const [stream, setStream] = useState(null); // match detail incl. sources
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [sourceIndex, setSourceIndex] = useState(0);

  const matches = useMemo(() => feed?.matches ?? [], [feed]);

  const visible = useMemo(() => {
    const pool = tab === "ALL" ? matches : matches.filter((game) => game.status === tab);
    return sortByStatus(pool);
  }, [matches, tab]);

  const shown = visible.slice(0, SHOW_LIMIT);
  const hidden = visible.length - shown.length;

  useEffect(() => {
    if (!watching) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setWatching(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [watching]);

  const openWatch = async (match) => {
    setWatching(match);
    setStream(null);
    setStreamError(null);
    setSourceIndex(0);
    setStreamLoading(true);
    try {
      const detail = await loadMatchDetail({ id: match.id });
      setStream(detail);
    } catch (error) {
      setStreamError(error?.message ?? "Sportsrc stream unavailable");
    } finally {
      setStreamLoading(false);
    }
  };

  const closeWatch = () => {
    setWatching(null);
    setStream(null);
    setStreamError(null);
    setSourceIndex(0);
  };

  const sources = stream?.sources ?? [];
  const activeSource = sources[Math.min(sourceIndex, Math.max(sources.length - 1, 0))] ?? null;
  const statusLabel =
    watching?.status === "LIVE" ? watching.clock || "Live" : watching?.status ?? "Upcoming";

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

      {watching ? (
        <div className="sh-stream-overlay" role="dialog" aria-modal="true" aria-label="Livestream">
          <div className="sh-stream-modal">
            <header className="sh-stream-head">
              <div className="sh-stream-titles">
                <span className="sh-comp-chip">
                  <i style={{ background: watching.leagueColor || "var(--accent)" }} />
                  {watching.competition}
                </span>
                <h3>
                  {watching.home} <em>v</em> {watching.away}
                </h3>
                <span className={`sh-clock ${watching.status === "LIVE" ? "is-live" : ""}`}>
                  {statusLabel}
                </span>
              </div>
              <button
                type="button"
                className="sh-stream-close"
                onClick={closeWatch}
                aria-label="Close livestream"
                title="Close livestream"
              >
                ✕
              </button>
            </header>

            <div className="sh-stream-body">
              {streamLoading ? (
                <p className="sh-panel-note">Loading stream…</p>
              ) : streamError ? (
                <p className="sh-panel-note">{streamError}</p>
              ) : sources.length === 0 ? (
                <p className="sh-panel-note">
                  No stream sources available for this match right now.
                </p>
              ) : (
                <>
                  {sources.length > 1 ? (
                    <div
                      className="sh-stream-tabs"
                      role="tablist"
                      aria-label="Stream sources"
                    >
                      {sources.map((source, index) => (
                        <button
                          key={source.id ?? source.source ?? index}
                          type="button"
                          role="tab"
                          aria-selected={index === Math.min(sourceIndex, sources.length - 1)}
                          className={`sh-stream-tab ${
                            index === Math.min(sourceIndex, sources.length - 1) ? "is-active" : ""
                          }`}
                          onClick={() => setSourceIndex(index)}
                        >
                          {source.source ?? `Source ${index + 1}`}
                          {source.hd ? " · HD" : ""}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <iframe
                    className="sh-stream-frame"
                    src={activeSource.embedUrl}
                    title={`${watching.home} v ${watching.away} livestream`}
                    allow="autoplay; fullscreen; encrypted-media"
                    allowFullScreen
                  />
                  <p className="sh-panel-note">
                    Streams come from third-party providers and include their ads.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
