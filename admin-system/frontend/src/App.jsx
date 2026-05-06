import React from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AuditLogs from "./pages/AuditLogs";
import TemperatureLogs from "./pages/TemperatureLogs";
import UsersPage from "./pages/UsersPage";
import ProjectsPage from "./pages/ProjectsPage";
import RoomsPage from "./pages/RoomsPage";
import "./App.css";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/audit-logs", label: "Audit Logs" },
  { to: "/temperature-logs", label: "Temperature Logs" },
  { to: "/users", label: "Users" },
  { to: "/projects", label: "Projects" },
  { to: "/rooms", label: "Rooms" },
];

const App = () => {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">T</span>
            <div className="brand-copy">
              <span className="brand-kicker">TANIM</span>
              <h1>Admin System</h1>
              <p>Operations console</p>
            </div>
          </div>
          <div className="topbar-meta">
            <span className="status-chip">Live control plane</span>
          </div>
          <nav className="nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/temperature-logs" element={<TemperatureLogs />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
