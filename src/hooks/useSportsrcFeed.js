import { useCallback, useEffect, useState } from "react";
import { hasSportsrcKey, isSportsrcDisabled, loadMatches } from "../api/sportsrc";

export const SPORTSRC_REFRESH_INTERVAL = 60 * 1000;

function timeLabel(date) {
  if (!date) return "";
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  } catch {
    return "";
  }
}

function statusBadge(status) {
  switch (status) {
    case "live":
    case "refreshing":
      return "LIVE · SPORTSRC";
    case "stale":
      return "STALE · SPORTSRC";
    case "loading":
      return "SYNCING SPORTSRC";
    case "offline":
      return "OFFLINE · SPORTSRC";
    default:
      return "SPORTSRC DISABLED";
  }
}

function statusLabel(status, updatedAt) {
  switch (status) {
    case "live":
    case "refreshing":
      return `Sportsrc live · ${timeLabel(updatedAt)}`;
    case "stale":
      return `Sportsrc last synced · ${timeLabel(updatedAt)}`;
    case "loading":
      return "Syncing with Sportsrc…";
    case "offline":
      return "Sportsrc unavailable · try again";
    default:
      return "Sportsrc disabled";
  }
}

/**
 * Polls the Sportsrc football fixtures feed and keeps the bundled ESPN view
 * untouched when Sportsrc is missing, disabled or unreachable — the panel
 * simply hides instead of breaking.
 *
 * The default sport is football — the only sport the free plan serves.
 *
 * By default the feed is fetched with the server's default window (everything
 * upcoming + live + recently finished); the panel filters client-side. Pass
 * `filterStatus`/`date` to narrow the API request instead — `filterStatus` ∈
 * inprogress | upcoming | finished, `date` = YYYY-MM-DD.
 *
 * @param {object} options
 * @param {"football"} [options.sport] sport to fetch (football is the free plan)
 * @param {boolean} [options.enabled] false → never hit the network
 * @param {string} [options.filterStatus] "inprogress" | "upcoming" | "finished"
 * @param {string} [options.date] YYYY-MM-DD (only the server default window otherwise)
 * @param {number} [options.refreshMs] polling interval, 0 disables polling
 */
export function useSportsrcFeed({
  sport = "football",
  enabled = true,
  filterStatus = null,
  date = null,
  refreshMs = SPORTSRC_REFRESH_INTERVAL,
} = {}) {
  const canFetch = enabled && !isSportsrcDisabled() && hasSportsrcKey();

  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState(canFetch ? "loading" : "disabled");
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!canFetch) return undefined;

    let cancelled = false;

    const load = async (force) => {
      try {
        const result = await loadMatches({ sport, status: filterStatus, date, force });
        if (cancelled) return;
        setMatches(result);
        setStatus("live");
        setError(null);
        setUpdatedAt(new Date());
      } catch (requestError) {
        if (cancelled) return;
        setStatus((previous) =>
          previous === "live" || previous === "refreshing" || previous === "stale"
            ? "stale"
            : "offline"
        );
        setError(requestError?.message ?? "Sportsrc request failed");
      }
    };

    setStatus((previous) => (previous === "live" || previous === "stale" ? "refreshing" : "loading"));
    load(nonce > 0);

    const timer =
      refreshMs > 0
        ? setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            load(false);
          }, refreshMs)
        : null;

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [sport, filterStatus, date, canFetch, refreshMs, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);
  const refreshing = status === "loading" || status === "refreshing";

  return {
    matches,
    status,
    source: matches.length ? "sportsrc" : "sportsrc-empty",
    isLive: matches.length > 0 && status !== "offline",
    refreshing,
    error,
    updatedAt,
    label: statusLabel(status, updatedAt),
    badge: statusBadge(status),
    refresh,
  };
}

export default useSportsrcFeed;
