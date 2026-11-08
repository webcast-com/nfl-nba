import React, { useMemo, useState } from "react";
import { HeroTicker } from "../components/Scoreboard";
import { MobileSectionTabs } from "../components/Shell";
import SportsrcPanel from "../components/SportsrcPanel";
import StreamOverlay from "../components/StreamOverlay";
import { usePageMeta } from "../hooks/usePageMeta";
import { useSportsrcFeed } from "../hooks/useSportsrcFeed";
import { sortByStatus } from "../utils/dashboard";

/**
 * StreamLive — every fixture the Sportsrc feed carries (football on the free
 * plan), fronted by a ticker of the live and upcoming games. Each fixture has
 * a stream: the hero's Watch button and the cards' Watch buttons open the
 * same shared `StreamOverlay` (see src/components/StreamOverlay.jsx).
 */
export default function StreamLivePage() {
  usePageMeta(
    "StreamLive",
    "Watch live football games from around the world — every fixture the Sportsrc feed carries, with its livestream."
  );
  // Sportsrc's free plan covers football; basketball is premium.
  const feed = useSportsrcFeed({ sport: "football" });
  const [watching, setWatching] = useState(null);

  // The ticker carries live games first, then what is about to start.
  const heroGames = useMemo(
    () =>
      sortByStatus(
        (feed.matches ?? []).filter(
          (game) => game.status === "LIVE" || game.status === "UPCOMING"
        )
      ),
    [feed.matches]
  );

  return (
    <main className="sh-dash is-streamlive">
      <h1 className="sh-sr-only">StreamLive</h1>

      <div className="sh-center">
        <div id="section-live">
          <HeroTicker games={heroGames} sport="basketball" onWatch={setWatching} />
        </div>

        <SportsrcPanel feed={feed} title="Football" />
      </div>

      <MobileSectionTabs />

      {watching ? (
        <StreamOverlay match={watching} onClose={() => setWatching(null)} />
      ) : null}
    </main>
  );
}
