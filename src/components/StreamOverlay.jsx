import React, { useEffect, useState } from "react";
import { loadMatchDetail } from "../api/sportsrc";

/**
 * Livestream modal for one Sportsrc fixture. Fetches the match detail
 * (`?type=detail&id=…`) and renders its `sources[].embedUrl` inside an
 * `<iframe>` — the API docs require standard permissions and forbid
 * `sandbox`. Multiple sources get a tab strip; the modal closes on the close
 * button or Escape.
 */
export default function StreamOverlay({ match, onClose }) {
  const [stream, setStream] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    if (!match) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [match, onClose]);

  useEffect(() => {
    if (!match) return undefined;
    let cancelled = false;
    setStream(null);
    setStreamError(null);
    setSourceIndex(0);
    setStreamLoading(true);
    loadMatchDetail({ id: match.id })
      .then((detail) => {
        if (!cancelled) setStream(detail);
      })
      .catch((error) => {
        if (!cancelled) setStreamError(error?.message ?? "Sportsrc stream unavailable");
      })
      .finally(() => {
        if (!cancelled) setStreamLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [match]);

  const sources = stream?.sources ?? [];
  const activeIndex = Math.min(sourceIndex, Math.max(sources.length - 1, 0));
  const activeSource = sources[activeIndex] ?? null;
  const statusLabel =
    match.status === "LIVE" ? match.clock || "Live" : match.status ?? "Upcoming";

  return (
    <div className="sh-stream-overlay" role="dialog" aria-modal="true" aria-label="Livestream">
      <div className="sh-stream-modal">
        <header className="sh-stream-head">
          <div className="sh-stream-titles">
            <span className="sh-comp-chip">
              <i style={{ background: match.leagueColor || "var(--accent)" }} />
              {match.competition}
            </span>
            <h3>
              {match.home} <em>v</em> {match.away}
            </h3>
            {(stream?.venue ?? match.venue) ? (
              <span className="sh-stream-venue">{stream?.venue ?? match.venue}</span>
            ) : null}
            <span className={`sh-clock ${match.status === "LIVE" ? "is-live" : ""}`}>
              {statusLabel}
            </span>
          </div>
          <button
            type="button"
            className="sh-stream-close"
            onClick={onClose}
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
                      aria-selected={index === activeIndex}
                      className={`sh-stream-tab ${index === activeIndex ? "is-active" : ""}`}
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
                title={`${match.home} v ${match.away} livestream`}
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
  );
}
