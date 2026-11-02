import React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import BasketballPage from "./pages/BasketballPage";
import NFLPage from "./pages/NFLPage";
import "./app.css";

export default function App() {
  return (
    <>
      <nav className="sh-nav" aria-label="Sports">
        <NavLink to="/basketball" className={({ isActive }) => `sh-nav-link ${isActive ? "active" : ""}`}>
          Basketball
        </NavLink>
        <NavLink to="/nfl" className={({ isActive }) => `sh-nav-link ${isActive ? "active" : ""}`}>
          NFL
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/basketball" replace />} />
        <Route path="/basketball" element={<BasketballPage />} />
        <Route path="/nfl" element={<NFLPage />} />
        <Route path="*" element={<Navigate to="/basketball" replace />} />
      </Routes>
    </>
  );
}
