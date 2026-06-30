import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

// Navbar
// Navigation bar with links, crop group switcher, and user menu; interacts with AuthContext and manages crop group selection
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedCropGroup, setSelectedCropGroup] = useState(
    localStorage.getItem("selectedCropGroup") ||
      user?.current_crop_group ||
      "legumes",
  );
  const availableCropGroups = user?.crop_groups || [];
  const currentCropGroup = availableCropGroups.includes(selectedCropGroup)
    ? selectedCropGroup
    : user?.current_crop_group || availableCropGroups[0] || "legumes";

  // handleLogout
  // Logs out user and redirects to login page
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // handleSwitchCropGroup
  // Switches to different crop group and updates localStorage
  const handleSwitchCropGroup = (cropGroup) => {
    setSelectedCropGroup(cropGroup);
    // Store in localStorage for persistence
    localStorage.setItem("selectedCropGroup", cropGroup);
    setShowUserMenu(false);
    // Navigate within SPA to avoid host-level 404 on nested routes after switch
    navigate("/", { replace: true });
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Role-based feature access
  const canAccessFeature = (feature) => {
    const featureAccess = {
      admin: ["seeds", "transactions", "reports", "notifications", "all"],
      researcher: ["seeds", "transactions", "notifications"],
      staff: ["seeds", "transactions", "notifications"],
      guest: ["seeds", "transactions"],
    };
    return featureAccess[user?.role]?.includes(feature) || false;
  };

  const canCreateSeed = () =>
    ["admin", "researcher", "staff"].includes(user?.role);
  const canAddTransaction = () =>
    ["admin", "researcher", "staff", "guest"].includes(user?.role);
  const canAccessReports = () => ["admin", "researcher"].includes(user?.role);
  const showNotificationBell = () => user?.role !== "guest";
  const showCropGroupSwitcher = user?.role !== "guest";

  return (
    <nav
      className="sticky top-0 z-50 animate-slide-down shadow-lg"
      style={{
        height: "68px",
        background: "linear-gradient(90deg, #116B2B 0%, #237F18 60%, #c8b400 100%)",
      }}>
      <div className="mx-auto flex items-center justify-between h-full" style={{ padding: "0 32px", maxWidth: "1440px" }}>
        {/* LOGO */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-white no-underline shrink-0">
              <span className="text-xl font-bold tracking-widest text-white">TANIM</span>
            </Link>

            <div className="hidden md:flex items-center" style={{ gap: "28px", marginLeft: "36px" }}>
              <Link
                to="/"
                className={`no-underline text-sm font-medium transition-all duration-200 pb-0.5 border-b-2 ${
                  isActive("/") ? "text-white border-white font-semibold" : "text-white/70 border-transparent hover:text-white"
                }`}>
                Dashboard
              </Link>

              {user?.role !== "guest" && canAccessFeature("seeds") && (
                <Link
                  to="/seeds"
                  className={`no-underline text-sm font-medium transition-all duration-200 pb-0.5 border-b-2 ${
                    isActive("/seeds") ? "text-white border-white font-semibold" : "text-white/70 border-transparent hover:text-white"
                  }`}>
                  Seed Lots
                </Link>
              )}

              {canAccessFeature("transactions") && (
                <Link
                  to="/transactions"
                  className={`no-underline text-sm font-medium transition-all duration-200 pb-0.5 border-b-2 ${
                    isActive("/transactions") ? "text-white border-white font-semibold" : "text-white/70 border-transparent hover:text-white"
                  }`}>
                  Transactions
                </Link>
              )}

              {canAccessReports() && (
                <Link
                  to="/reports"
                  className={`no-underline text-sm font-medium transition-all duration-200 pb-0.5 border-b-2 ${
                    isActive("/reports") ? "text-white border-white font-semibold" : "text-white/70 border-transparent hover:text-white"
                  }`}>
                  Reports
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="hidden md:flex items-center" style={{ gap: "12px" }}>
            {showNotificationBell() && 
              <div className="relative flex items-center justify-center">
                <NotificationBell />
              </div>
            }
            <div
              className="relative"
              onMouseEnter={() => setShowUserMenu(true)}
              onMouseLeave={() => setShowUserMenu(false)}
            >
              {/* USER */}
              <div
                className="flex items-center gap-2.5 cursor-pointer rounded-lg px-3 py-1.5 transition-all duration-200"
                style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(6px)" }}
              >
                {/* AVATAR */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
                  style={{ background: "#FFFF00", color: "#116B2B" }}
                >
                  {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className="text-white/55 text-[10px] uppercase tracking-wider">Logged in as</p>
                  <p className="text-white font-semibold text-xs">
                    {user?.name || user?.email?.split("@")[0] || "User"}
                  </p>
                </div>
                {/* Dropdown chevron */}
                <svg className="w-3 h-3 text-white/50 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            {/* Drop down Crop groups */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#116B2B] shadow-xl border border-white/10 overflow-hidden z-50">

                {showCropGroupSwitcher && (
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-xs uppercase tracking-widest text-white font-bold mb-2">
                      Crop Groups
                    </p>

                    <div className="space-y-1">
                      {availableCropGroups.length > 1 ? (
                        availableCropGroups.map((group) => (
                          <button
                            key={group}
                            onClick={() => handleSwitchCropGroup(group)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              currentCropGroup === group
                                ? "bg-white text-[#116B2B] font-semibold"
                                : "text-white hover:bg-white/10"
                            }`}
                          >
                            {group.charAt(0).toUpperCase() + group.slice(1)}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 rounded-lg text-sm text-white bg-white/10">
                          {currentCropGroup.charAt(0).toUpperCase() +
                            currentCropGroup.slice(1)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
                >
                LOG OUT
                </button>
              </div>
            )}
            </div>
          </div>
        {/* ── End desktop row ───────────────────────────────────────── */}

        {/* Mobile menu button - only visible on mobile */}
        <div className="md:hidden absolute top-4 right-4">
          <button
            id="mobile-menu-button"
            className="text-white focus:outline-none bg-green-700 p-2 rounded-lg hover:bg-green-600 transition-colors duration-200"
            onClick={() => {
              const menu = document.getElementById("mobile-menu");
              menu.classList.toggle("hidden");
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className="hidden md:hidden bg-green-800 shadow-lg animate-slide-down"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`${
                isActive("/") && location.pathname === "/"
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700 hover:text-white"
              } block px-3 py-2 rounded-md text-base font-medium transition-all duration-200`}
              onClick={() =>
                document.getElementById("mobile-menu").classList.add("hidden")
              }
            >
              Dashboard
            </Link>
            {user?.role !== "guest" && (
              <Link
                to="/seeds"
                className={`${
                  isActive("/seeds")
                    ? "bg-green-700 text-white"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                } block px-3 py-2 rounded-md text-base font-medium transition-all duration-200`}
                onClick={() =>
                  document.getElementById("mobile-menu").classList.add("hidden")
                }
              >
                Seed Lots
              </Link>
            )}
            <Link
              to="/transactions"
              className={`${
                isActive("/transactions")
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700 hover:text-white"
              } block px-3 py-2 rounded-md text-base font-medium transition-all duration-200`}
              onClick={() =>
                document.getElementById("mobile-menu").classList.add("hidden")
              }
            >
              Transactions
            </Link>
            <Link
              to="/reports"
              className={`${
                isActive("/reports")
                  ? "bg-green-700 text-white"
                  : "text-green-100 hover:bg-green-700 hover:text-white"
              } block px-3 py-2 rounded-md text-base font-medium transition-all duration-200`}
              onClick={() =>
                document.getElementById("mobile-menu").classList.add("hidden")
              }
            >
              Reports
            </Link>
            <div className="pt-4 pb-3 border-t border-green-700">
              <div className="flex items-center px-3">
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white">👤</span>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">
                    {user?.name || user?.email?.split("@")[0] || "User"}
                  </div>
                  <div className="text-sm font-medium text-green-200">
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    document
                      .getElementById("mobile-menu")
                      .classList.add("hidden");
                  }}
                  className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulseSlow {
            0%,
            100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.05);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .animate-slide-down {
            animation: slideDown 0.5s ease-out;
          }

          .animate-pulse-slow {
            animation: pulseSlow 2s ease-in-out infinite;
          }

          .animate-fade-in {
            animation: fadeIn 0.6s ease-out;
          }
        `}</style>
      </div>
    </nav>
  );
};

export default Navbar;
