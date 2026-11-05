import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const loadMatches = vi.fn();

vi.mock("../api/sportsrc", async () => {
  const actual = await vi.importActual("../api/sportsrc");
  return {
    ...actual,
    isSportsrcDisabled: () => false,
    hasSportsrcKey: () => true,
    loadMatches: (...args) => loadMatches(...args),
  };
});

const { useSportsrcFeed } = await import("./useSportsrcFeed");

const sportsrcMatch = {
  id: "uni-est",
  competitionId: "liga-revelacao-u23",
  competition: "Liga Revelação U23",
  country: "Portugal",
  status: "UPCOMING",
  clock: "Today · 20:00",
  home: "União Leiria U23",
  away: "Estoril U23",
  homeCode: "UNI",
  awayCode: "EST",
  homeScore: null,
  awayScore: null,
  venue: "Venue TBD",
};

beforeEach(() => {
  loadMatches.mockReset();
});

describe("useSportsrcFeed", () => {
  it("starts empty and swaps in the Sportsrc payload", async () => {
    loadMatches.mockResolvedValue([sportsrcMatch]);

    const { result } = renderHook(() => useSportsrcFeed());

    expect(result.current.matches).toHaveLength(0);
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("live"));

    expect(result.current.matches).toEqual([sportsrcMatch]);
    expect(result.current.source).toBe("sportsrc");
    expect(result.current.isLive).toBe(true);
    expect(result.current.badge).toBe("LIVE · SPORTSRC");
    expect(result.current.label).toContain("Sportsrc live");
  });

  it("reports offline when the feed fails", async () => {
    loadMatches.mockRejectedValue(new Error("Sportsrc request failed"));

    const { result } = renderHook(() => useSportsrcFeed());

    await waitFor(() => expect(result.current.status).toBe("offline"));
    expect(result.current.matches).toHaveLength(0);
    expect(result.current.error).toContain("Sportsrc");
  });

  it("keeps the previous payload and marks stale on later failures", async () => {
    loadMatches.mockResolvedValueOnce([sportsrcMatch]).mockRejectedValueOnce(
      new Error("Sportsrc request failed")
    );

    const { result } = renderHook(() => useSportsrcFeed());
    await waitFor(() => expect(result.current.status).toBe("live"));

    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.status).toBe("stale"));
    expect(result.current.matches).toEqual([sportsrcMatch]);
  });

  it("stays disabled and never fetches when gated off", () => {
    const { result } = renderHook(() => useSportsrcFeed({ enabled: false }));

    expect(result.current.status).toBe("disabled");
    expect(result.current.matches).toHaveLength(0);
    expect(loadMatches).not.toHaveBeenCalled();
  });

  it("refreshes on demand", async () => {
    loadMatches.mockResolvedValue([sportsrcMatch]);

    const { result } = renderHook(() => useSportsrcFeed({ refreshMs: 0 }));
    await waitFor(() => expect(result.current.status).toBe("live"));

    act(() => result.current.refresh());
    expect(result.current.status).toBe("refreshing");

    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(loadMatches).toHaveBeenCalledTimes(2);
  });
});
