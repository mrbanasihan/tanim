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
        background:
          "linear-gradient(90deg, #116B2B 0%, #237F18 60%, #FFFF00 100%)",
      }} >
      <div className="mx-auto" style={{ padding: "0 32px", maxWidth: "1440px", }} >
        <div className="flex justify-between items-center h-full">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                  to="/"
                  className="flex items-center gap-3 text-white"
                >
                  {/* LOGO PLACEMENT HERE!! */}
                  <div className="w-8 h-8 rounded-full border-2 border-white"></div>
                <span className="text-2xl font-bold tracking-wide text-white">
                  TANIM
                </span>
              </Link>
            </div>
        
            <div
              className="hidden md:flex items-center"
              style={{ gap: "32px", marginLeft: "40px" }}
            >
              <Link
                to="/"
               className={`relative text-base font-medium transition-all duration-200 ${
                    isActive("/")
                    ? "text-white border-b-2 border-white"
                    : "text-white/75 hover:text-white"
                }`}>
                Dashboard
              </Link>

              {user?.role !== "guest" && canAccessFeature("seeds") && (
                <Link
                  to="/seeds"
                  className={`relative text-base font-medium transition-all duration-200 ${
                    isActive("/seeds")
                      ? "text-white border-b-2 border-white"
                      : "text-white/75 hover:text-white"
                  }`}>
                  Seed Lots
                </Link>
              )}

              {canAccessFeature("transactions") && (
                <Link
                  to="/transactions"
                  className={`relative text-base font-medium transition-all duration-200 ${
                    isActive("/transactions")
                      ? "text-white border-b-2 border-white"
                      : "text-white/75 hover:text-white"
                  }`}>
                  Transactions
                </Link>
              )}

              {canAccessReports() && (
                <Link
                  to="/reports"
                 className={`relative text-base font-medium transition-all duration-200 ${
                    isActive("/reports")
                      ? "text-white border-b-2 border-white"
                      : "text-white/75 hover:text-white"
                  }`}>
                  Reports
                </Link>
              )}
            </div>
          </div>
          <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
            {showNotificationBell() && 
              <div className="w-8 h-8 flex items-center justify-center">
                <NotificationBell />
              </div>
            }
            <div
              className="relative py-2"
              onMouseEnter={() => setShowUserMenu(true)}
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
                <div className="w-8 h-8 bg-[#FFFFC7] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">👨🏻‍💼</span>
                </div>
                <div className="text-sm">
                  <p className="text-white/75 text-xs">
                      Welcome back
                  </p>

                  <p className="text-[#116B2B] font-bold">
                    {user?.name || user?.email?.split("@")[0] || "User"}
                  </p>
                </div>
              </div>
            {/*PLACEMENT OF THE DROP DOWN CROP GROUPS --- */}
            </div>
          </div>
        </div>

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
                <div className="flex-shrink-0">
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
