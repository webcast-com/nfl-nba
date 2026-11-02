const DATE_KEY_LENGTH = 8;

/** Date → YYYYMMDD (local, matching ESPN's `dates` parameter). */
export function toDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("");
}

/** YYYYMMDD → local Date at midday, avoiding DST edge cases. */
export function fromDateKey(key) {
  const digits = String(key ?? "").replace(/\D/g, "");
  if (digits.length !== DATE_KEY_LENGTH) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shiftDateKey(key, days) {
  const date = fromDateKey(key) ?? new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** "Today · Sun 2 Nov" style label for the scoreboard date stepper. */
export function formatDateKeyLabel(key) {
  const date = fromDateKey(key);
  if (!date) return "Today";
  const today = toDateKey(new Date());
  const prefix = key === today ? "Today" : null;
  let formatted;
  try {
    formatted = date.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    formatted = key;
  }
  return prefix ? `${prefix} · ${formatted}` : formatted;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Ten day window with the selected date highlighted (as in the live-score rail). */
export function buildDateRail(selectedKey, { before = 4, total = 10 } = {}) {
  const anchor = fromDateKey(selectedKey) ?? new Date();
  const items = [];
  for (let offset = -before; offset < total - before; offset += 1) {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + offset);
    const key = toDateKey(date);
    items.push({
      key,
      day: String(date.getDate()).padStart(2, "0"),
      weekday: WEEKDAYS[date.getDay()],
      title: formatDateKeyLabel(key),
    });
  }
  return items;
}

/** Week rail used by the NFL page. */
export function buildWeekRail(total = 18) {
  return Array.from({ length: total }, (_, index) => {
    const week = index + 1;
    return { key: String(week), day: String(week), weekday: "Wk", title: `Week ${week}` };
  });
}
