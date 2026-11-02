import React from "react";
import { IconChevronDown } from "./Icons";
import { Flag } from "./ui";

export const FLAG_CODES = {
  "United States": "us",
  Spain: "es",
  Germany: "de",
  France: "fr",
  Serbia: "rs",
  "United Kingdom": "gb",
  Australia: "au",
  China: "cn",
  Philippines: "ph",
  Kenya: "ke",
  Europe: "eu",
  Africa: null,
};

function SideHead({ children }) {
  return (
    <div className="sh-side-head">
      <span>{children}</span>
      <IconChevronDown size={15} className="is-up" />
    </div>
  );
}

export function LeagueSidebar({
  title = "Popular Leagues",
  leagues = [],
  activeLeague = "all",
  onLeague,
  groups = [],
}) {
  return (
    <aside className="sh-sidebar" aria-label="Competition filters">
      <section className="sh-leagues">
        <SideHead>{title}</SideHead>
        <div className="sh-league-list">
          {leagues.map((league) => {
            const active = activeLeague === league.id;
            return (
              <button
                key={league.id}
                type="button"
                className={`sh-league ${active ? "is-active" : ""}`}
                onClick={() => onLeague?.(league.id)}
                aria-pressed={active}
                title={league.name}
              >
                <span
                  aria-hidden="true"
                  className="sh-league-badge"
                  style={{ background: `linear-gradient(140deg, ${league.color || "#334155"}, ${league.color || "#334155"}99)` }}
                >
                  {league.short || league.name.slice(0, 3).toUpperCase()}
                </span>
                <span className="sh-league-name">{league.name}</span>
                <IconChevronDown size={14} className={`sh-league-chev ${active ? "is-up" : ""}`} />
              </button>
            );
          })}
        </div>
      </section>

      {groups.map((group) => (
        <section className="sh-leagues" key={group.title}>
          <SideHead>{group.title}</SideHead>
          <div className="sh-league-list">
            {group.items.map((item) => {
              const active = Boolean(item.active);
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`sh-league sh-league-plain ${active ? "is-active" : ""}`}
                  onClick={item.onClick}
                  aria-pressed={active}
                  title={item.label}
                >
                  {item.badge ? (
                    <span aria-hidden="true" className="sh-league-badge sh-league-badge-sm" style={{ background: item.color }}>
                      {item.badge}
                    </span>
                  ) : (
                    <Flag code={FLAG_CODES[item.label]} label={item.label} />
                  )}
                  <span className="sh-league-name">{item.label}</span>
                  <IconChevronDown size={14} className={`sh-league-chev ${active ? "is-up" : ""}`} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </aside>
  );
}
