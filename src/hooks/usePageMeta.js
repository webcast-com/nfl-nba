import { useEffect } from "react";

export const SITE_NAME = "ScoreHub";
export const SITE_TAGLINE =
  "Live basketball and NFL scores with boxscores, lineups, head-to-head history, league tables and play-by-play commentary.";

function upsertMeta(key, content) {
  if (typeof document === "undefined") return;
  const isProperty = key.startsWith("og:") || key.startsWith("twitter:");
  const attr = isProperty ? "property" : "name";
  let element = document.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonical(href) {
  if (typeof document === "undefined") return;
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/** Gives every client-rendered route its own title, description, canonical
 * and Open Graph / Twitter card so search engines can index each page. */
export function usePageMeta(title, description) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · ${SITE_TAGLINE}`;
    const summary = description ?? SITE_TAGLINE;
    const url = window.location.href.split("#")[0];

    document.title = fullTitle;
    upsertMeta("description", summary);
    upsertMeta("og:title", fullTitle);
    upsertMeta("og:description", summary);
    upsertMeta("og:url", url);
    upsertMeta("twitter:title", fullTitle);
    upsertMeta("twitter:description", summary);
    upsertCanonical(url);
  }, [title, description]);
}
