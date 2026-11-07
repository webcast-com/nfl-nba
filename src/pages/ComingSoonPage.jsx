import React from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";

export default function ComingSoonPage({ sport }) {
  usePageMeta(
    `${sport} Center`,
    `${sport} coverage and live scores are coming soon on ScoreHub.`
  );
  return (
    <main className="sh-coming">
      <h1 className="sh-sr-only">{sport} Center</h1>
      <section className="sh-coming-card">
        <span className="sh-coming-badge">{sport}</span>
        <h2>{sport} coverage is coming soon</h2>
        <p>
          ScoreHub currently ships live ESPN data for basketball and the NFL. This tab is
          reserved for the next feed.
        </p>
        <Link to="/basketball" className="sh-coming-link">
          Back to Basketball
        </Link>
      </section>
    </main>
  );
}
