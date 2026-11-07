import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SITE_TAGLINE, usePageMeta } from "./usePageMeta";

function MetaProbe({ title, description }) {
  usePageMeta(title, description);
  return null;
}

const metaContent = (key) => {
  const isProperty = key.startsWith("og:") || key.startsWith("twitter:");
  return document.head
    .querySelector(`meta[${isProperty ? "property" : "name"}="${key}"]`)
    ?.getAttribute("content");
};

describe("usePageMeta", () => {
  afterEach(() => {
    cleanup();
    document.title = "";
    for (const key of [
      "description",
      "og:title",
      "og:description",
      "og:url",
      "twitter:title",
      "twitter:description",
    ]) {
      const isProperty = key.startsWith("og:") || key.startsWith("twitter:");
      document.head
        .querySelector(`meta[${isProperty ? "property" : "name"}="${key}"]`)
        ?.remove();
    }
    document.head.querySelector('link[rel="canonical"]')?.remove();
  });

  it("falls back to the site tagline when the page passes no title", () => {
    render(<MetaProbe />);
    expect(document.title).toBe(`ScoreHub · ${SITE_TAGLINE}`);
    expect(metaContent("description")).toBe(SITE_TAGLINE);
  });

  it("names the page in the title, description and social tags", () => {
    render(<MetaProbe title="Boston Celtics" description="Boston Celtics schedule and stats." />);
    expect(document.title).toBe("Boston Celtics · ScoreHub");
    expect(metaContent("description")).toBe("Boston Celtics schedule and stats.");
    expect(metaContent("og:title")).toBe("Boston Celtics · ScoreHub");
    expect(metaContent("og:description")).toBe("Boston Celtics schedule and stats.");
    expect(metaContent("twitter:title")).toBe("Boston Celtics · ScoreHub");
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical).toBeTruthy();
    expect(canonical.getAttribute("href")).toContain("http");
  });

  it("updates the document when the page data changes", () => {
    const { rerender } = render(<MetaProbe title="First" />);
    expect(document.title).toBe("First · ScoreHub");
    rerender(<MetaProbe title="Second" description="Second description." />);
    expect(document.title).toBe("Second · ScoreHub");
    expect(metaContent("description")).toBe("Second description.");
    expect(metaContent("og:description")).toBe("Second description.");
  });
});
