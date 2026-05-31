import React from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AuditLogs from "./pages/AuditLogs";
import TemperatureLogs from "./pages/TemperatureLogs";
import NotificationLogs from "./pages/NotificationLogs";
import UsersPage from "./pages/UsersPage";
import ProjectsPage from "./pages/ProjectsPage";
import RoomsPage from "./pages/RoomsPage";
import "./App.css";

// App
// Main admin system application with navigation and route setup
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
          <Route path="/notification-logs" element={<NotificationLogs />} />
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
