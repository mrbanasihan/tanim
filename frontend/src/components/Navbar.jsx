import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-gradient-to-r from-green-800 to-emerald-700 shadow-lg sticky top-0 z-50 animate-slide-down">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                to="/"
                className="text-xl font-bold text-white hover:text-green-200 transition-colors duration-300 flex items-center space-x-2"
              >
                <span>TANIM</span>
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-1">
              <Link
                to="/"
                className={`${
                  isActive("/") && location.pathname === "/"
                    ? "bg-green-700 text-white shadow-md"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                } transition-all duration-300 transform px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2`}
              >
                <span>Dashboard</span>
              </Link>
              <Link
                to="/seeds"
                className={`${
                  isActive("/seeds")
                    ? "bg-green-700 text-white shadow-md"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                } transition-all duration-300 transform px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2`}
              >
                <span>Seed Lots</span>
              </Link>
              <Link
                to="/transactions"
                className={`${
                  isActive("/transactions") && !isActive("/transactions/new")
                    ? "bg-green-700 text-white shadow-md"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                } transition-all duration-300 transform px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2`}
              >
                <span>Transactions</span>
              </Link>
              <Link
                to="/transactions/new"
                className={`${
                  isActive("/transactions/new")
                    ? "bg-green-700 text-white shadow-md"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                } transition-all duration-300 transform px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2`}
              >
                <span>New Transaction</span>
              </Link>
              <Link
                to="/reports"
                className={`${
                  isActive("/reports")
                    ? "bg-green-700 text-white shadow-md"
                    : "text-green-100 hover:bg-green-700 hover:text-white"
                } transition-all duration-300 transform px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2`}
              >
                <span>Reports</span>
              </Link>
            </div>
          </div>
          <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
            <div
              className="relative py-2"
              onMouseEnter={() => setShowLogout(true)}
              onMouseLeave={() => setShowLogout(false)}
            >
              <div className="flex items-center space-x-3 bg-green-900/30 px-4 py-2 rounded-lg animate-fade-in cursor-pointer hover:bg-green-900/50 transition-all duration-300">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">👤</span>
                </div>
                <div className="text-sm">
                  <p className="text-green-200 text-xs">Welcome back,</p>
                  <p className="text-white font-semibold">
                    {user?.name || user?.email?.split("@")[0] || "User"}
                  </p>
                </div>
              </div>
              {showLogout && (
                <div className="absolute right-0 mt-1">
                  <button
                    onClick={handleLogout}
                    className="text-red-300 hover:text-red-100 text-sm font-medium whitespace-nowrap bg-green-900 px-4 py-2 rounded-lg transition-all duration-200 hover:bg-green-900 shadow-lg block w-full text-left"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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
          <Link
            to="/transactions"
            className={`${
              isActive("/transactions") && !isActive("/transactions/new")
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
            to="/transactions/new"
            className={`${
              isActive("/transactions/new")
                ? "bg-green-700 text-white"
                : "text-green-100 hover:bg-green-700 hover:text-white"
            } block px-3 py-2 rounded-md text-base font-medium transition-all duration-200`}
            onClick={() =>
              document.getElementById("mobile-menu").classList.add("hidden")
            }
          >
            New Transaction
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
    </nav>
  );
};

export default Navbar;
