import React from "react";
import { NavLink } from "react-router-dom";
import {
  IconBall,
  IconBell,
  IconCalendar,
  IconCricket,
  IconFile,
  IconFootball,
  IconGrid,
  IconMoon,
  IconPuck,
  IconSearch,
  IconShuttle,
  IconSun,
  IconTarget,
  IconTrophy,
  IconUsers,
  IconPlay,
  LogoMark,
} from "./Icons";

export const SPORT_TABS = [
  { to: "/basketball", label: "Basketball", icon: IconBall },
  { to: "/nfl", label: "Football", icon: IconFootball },
  { to: "/cricket", label: "Cricket", icon: IconCricket },
  { to: "/badminton", label: "Badminton", icon: IconShuttle },
  { to: "/hockey", label: "Hockey", icon: IconPuck },
];

const RAIL_ITEMS = [
  { id: "overview", label: "Overview", icon: IconGrid, active: true },
  { id: "watch", label: "Watch live", icon: IconPlay },
  { id: "community", label: "Community", icon: IconUsers },
  { id: "schedule", label: "Schedule", icon: IconCalendar },
  { id: "alerts", label: "Alerts", icon: IconBell },
  { id: "news", label: "News", icon: IconFile },
  { id: "trophies", label: "Trophies", icon: IconTrophy },
  { id: "my-teams", label: "My teams", icon: IconTarget },
];

export function IconRail() {
  return (
    <aside className="sh-rail" aria-label="Primary">
      <span className="sh-rail-logo" title="ScoreHub">
        <LogoMark size={26} />
      </span>
      <div className="sh-rail-items">
        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`sh-rail-btn ${item.active ? "is-active" : ""}`}
              aria-label={item.label}
              title={item.label}
              aria-current={item.active ? "page" : undefined}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
      <span className="sh-rail-status" aria-hidden="true" />
    </aside>
  );
}

export function TopBar({ theme = "dark", onThemeChange, onSearch }) {
  return (
    <header className="sh-topbar">
      <div className="sh-brand">
        <span className="sh-brand-mark">
          <LogoMark size={22} />
        </span>
        <span className="sh-brand-name">
          Score<span>Hub</span>
        </span>
      </div>

      <nav className="sh-sport-tabs" aria-label="Sports">
        {SPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `sh-sport-tab ${isActive ? "is-active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  {isActive ? <Icon size={16} /> : null}
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sh-topbar-actions">
        <button type="button" className="sh-icon-btn" aria-label="Search teams or competitions" title="Search" onClick={onSearch}>
          <IconSearch size={17} />
        </button>
        <button type="button" className="sh-icon-btn sh-icon-btn-dot" aria-label="Notifications" title="Notifications">
          <IconBell size={17} />
          <i className="sh-notify-dot" />
        </button>
        <div className="sh-theme" role="group" aria-label="Color theme">
          <button
            type="button"
            className={theme === "dark" ? "is-on" : ""}
            onClick={() => onThemeChange?.("dark")}
            aria-label="Dark theme"
            aria-pressed={theme === "dark"}
          >
            <IconMoon size={14} />
          </button>
          <button
            type="button"
            className={theme === "light" ? "is-on" : ""}
            onClick={() => onThemeChange?.("light")}
            aria-label="Light theme"
            aria-pressed={theme === "light"}
          >
            <IconSun size={14} />
          </button>
        </div>
        <span className="sh-avatar" aria-hidden="true">SH</span>
      </div>
    </header>
  );
}
