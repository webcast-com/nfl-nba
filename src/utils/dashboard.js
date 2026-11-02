/** Display helpers shared by the dashboard pages. */

export function buildTeamLogoMap(games = [], standings = []) {
  const map = {};

  games.forEach((game) => {
    if (game.home && game.homeLogo) map[game.home] = game.homeLogo;
    if (game.away && game.awayLogo) map[game.away] = game.awayLogo;
  });

  standings.forEach((group) => {
    (group.rows ?? []).forEach((row) => {
      if (row.team && row.logo) map[row.team] = row.logo;
    });
  });

  return map;
}

export function seasonLabelFor(sport, meta = {}) {
  const year = meta?.seasonYear ?? meta?.year ?? null;
  if (!year) return sport === "football" ? "2025" : "2025-2026";
  return sport === "football" ? String(year) : `${year}-${year + 1}`;
}

export function competitionColors(competitions = []) {
  return competitions.reduce((map, competition) => {
    map[competition.id] = competition.color ?? null;
    return map;
  }, {});
}

export function featuredGame(games = []) {
  if (!games.length) return null;
  return (
    games.find((game) => game.status === "LIVE") ??
    games.find((game) => game.status === "UPCOMING") ??
    games[0]
  );
}
