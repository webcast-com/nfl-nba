import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { detailSport } from "../data/detailConfig";
import { basketballNews, nflNews } from "../data/newsData";
import { isEspnDisabled, loadNews } from "../api/espn";
import { EmptyState } from "../components/ui";

function fromEspn(article) {
  return {
    id: article.id,
    tag: article.tag ?? "ESPN",
    accent: "#8b7cf6",
    title: article.headline,
    summary: article.description ?? "",
    author: article.byline ?? "ESPN",
    published: article.published
      ? new Date(article.published).toLocaleDateString([], { day: "numeric", month: "short" })
      : "",
    readTime: "ESPN",
    image: article.image,
  };
}

export default function NewsPage({ sport = "basketball" }) {
  const config = detailSport(sport);
  const demo = sport === "football" ? nflNews : basketballNews;
  const [articles, setArticles] = useState(demo);

  useEffect(() => {
    setArticles(demo);
    if (isEspnDisabled()) return undefined;
    let active = true;
    loadNews(config.leagueKey)
      .then((remote) => {
        if (active && remote.length) setArticles([...remote.map(fromEspn), ...demo]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [config.leagueKey, demo]);

  return (
    <main className="sh-detail">
      <header className="sh-page-head">
        <span className="sh-detail-kicker">{config.hubLabel} newsroom</span>
        <h1 className="sh-detail-title">Latest news</h1>
        <p className="sh-page-sub">
          Match reports, previews and analysis from across the {config.label}.
        </p>
      </header>

      {articles.length ? (
        <div className="sh-news-grid">
          {articles.map((article) => (
            <article className="sh-news-card" key={article.id ?? article.title}>
              <span className="sh-news-accent" style={{ "--news-accent": article.accent }} />
              <div className="sh-news-body">
                <span className="sh-news-tag">{article.tag}</span>
                <h2 className="sh-news-title">{article.title}</h2>
                <p className="sh-news-summary">{article.summary}</p>
                <div className="sh-news-meta">
                  <span>{article.author}</span>
                  <span aria-hidden="true">·</span>
                  <span>{article.published}</span>
                  <span aria-hidden="true">·</span>
                  <span>{article.readTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No stories yet" hint="News arrives with the next feed refresh." />
      )}

      <p className="sh-detail-note">
        Previews and reports are bundled with the app for offline use.{" "}
        <Link to={config.hub}>Back to the {config.hubLabel} hub</Link>
      </p>
    </main>
  );
}
