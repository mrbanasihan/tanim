import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { filterByCropGroup } from "../utils/accessControl";
import { getSelectedCropGroup, CROP_GROUPS } from "../constants/cropCatalog";

// Dashboard
// Main dashboard page displaying statistics, recent transactions, projects, and active users
function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSeeds: 0,
    totalProjects: 0,
    recentTransactions: [],
    projects: [],
    activeUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // normalizeTransaction
  // Normalizes transaction data structure from API response
  const normalizeTransaction = (transaction) => ({
    ...transaction,
    type: transaction.type || transaction.transaction_type,
    id: transaction.id || transaction.transaction_id,
    seed_id: transaction.seed_id || transaction.seed_lot_id,
    created_by: transaction.created_by || transaction.user_id || "Unknown",
    user_name:
      transaction.user_name ||
      transaction.name ||
      transaction.created_by ||
      "Unknown User",
    user_email: transaction.user_email || transaction.email || "",
    user_first_name:
      transaction.user_first_name || transaction.first_name || "",
    user_last_name: transaction.user_last_name || transaction.last_name || "",
  });

  // getUserFullName
  // Extracts user full name from transaction data with fallback parsing
  const getUserFullName = (userData) => {
    if (userData.user_first_name && userData.user_last_name) {
      return `${userData.user_first_name} ${userData.user_last_name}`;
    }

    const fullName = userData.user_name || userData.name;
    if (fullName && fullName !== "Unknown" && fullName !== "Unknown User") {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0]} ${parts[parts.length - 1]}`;
      }
      return fullName;
    }

    return "Unknown User";
  };

  // getFirstName / getLastName
  const getFirstName = (userData) => {
    const fullName = getUserFullName(userData);
    if (fullName === "Unknown User") return fullName;
    return fullName.split(/\s+/)[0];
  };

  const getLastName = (userData) => {
    const fullName = getUserFullName(userData);
    if (fullName === "Unknown User") return "";
    const parts = fullName.trim().split(/\s+/);
    return parts.length >= 2 ? parts[parts.length - 1] : "";
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const initialGroup = getSelectedCropGroup(user?.role, user?.crop_groups);
        if (initialGroup) setSelectedGroup(initialGroup);

        const [seedsRes, projectsRes, transactionsRes] = await Promise.all([
          api.get("/seeds"),
          api.get(
            initialGroup
              ? `/projects?crop_group=${initialGroup}`
              : "/projects",
          ),
          api.get("/transactions"),
        ]);

        const filteredSeeds = filterByCropGroup(
          seedsRes.data || [],
          user?.role,
          user?.crop_groups,
        );
        const transactions = filterByCropGroup(
          (transactionsRes.data || []).map(normalizeTransaction),
          user?.role,
          user?.crop_groups,
        );

        const uniqueUsers = Array.from(
          new Map(
            transactions.map((t) => [
              t.user_email || t.created_by || `user-${t.id}`,
              {
                id: t.user_email || t.created_by || `user-${t.id}`,
                firstName: getFirstName(t),
                lastName: getLastName(t),
                fullName: getUserFullName(t),
                email: t.user_email,
                lastActivity: t.created_at,
                transactionCount: 1,
                transactionType: t.type,
              },
            ]),
          ).values(),
        ).slice(0, 5);

        setStats({
          totalSeeds: filteredSeeds.length,
          totalProjects: projectsRes.data.length,
          recentTransactions: transactions,
          projects: projectsRes.data.filter((p) => p.status !== "completed"),
          activeUsers: uniqueUsers,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.role, user?.crop_groups]);



  // getTypeBadge
  // Returns Tailwind classes for transaction type badges
  const getTypeBadge = (type) => {
    const normalized = (type || "").toLowerCase();
    if (normalized === "outgoing" || normalized === "checkout") {
      return "bg-blue-100 text-blue-800 border border-blue-200";
    }
    if (normalized === "disposal") {
      return "bg-red-100 text-red-700 border border-red-200";
    }
    if (normalized === "incoming" || normalized === "checkin") {
      return "bg-green-100 text-green-800 border border-green-200";
    }
    return "bg-gray-100 text-gray-700 border border-gray-200";
  };

  const CROP_GROUP_PILLS = [
    { key: "vegetables", label: "Vegetables" },
    { key: "legumes", label: "Legumes" },
    { key: "cereals", label: "Cereals" },
  ];

  const filteredTransactions = stats.recentTransactions;
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage <= 3) {
        pages.push(2);
        pages.push(3);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push("...");
        pages.push(totalPages - 2);
        pages.push(totalPages - 1);
        pages.push(totalPages);
      } else {
        pages.push("...");
        pages.push(currentPage);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const displayName =
    user?.name || user?.email?.split("@")[0] || "Admin";

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F5F7F5" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-green-800 border-t-transparent animate-spin" />
          <p className="text-green-900 font-medium text-sm">
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-6 py-6"
      style={{ backgroundColor: "#F5F7F5" }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* ══════════════════ LEFT — MAIN CONTENT ══════════════════ */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Welcome Banner */}
          <div
            className="rounded-xl px-7 py-6 shadow-sm border border-[#E0E0E0]"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#1B5E20" }}>
              Welcome back, {displayName}! 🌱
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Manage your seed inventory, track transactions, and monitor your
              projects all in one place.
            </p>
          </div>

          {/* Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Seed Lots */}
            <div
              className="rounded-xl p-5 border shadow-sm flex flex-col gap-1"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Seed Lots
              </p>
              <p
                className="text-3xl font-extrabold"
                style={{ color: "#558B2F" }}
              >
                {stats.totalSeeds}
              </p>
              <span className="text-xs text-gray-400 mt-1">
                Across all crop groups
              </span>
            </div>

            {/* Total Projects */}
            <div
              className="rounded-xl p-5 border shadow-sm flex flex-col gap-1"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Projects
              </p>
              <p
                className="text-3xl font-extrabold"
                style={{ color: "#558B2F" }}
              >
                {stats.totalProjects}
              </p>
              <span className="text-xs text-gray-400 mt-1">
                {stats.projects.length} currently active
              </span>
            </div>

            {/* Recent Transactions */}
            <div
              className="rounded-xl p-5 border shadow-sm flex flex-col gap-1"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Recent Transactions
              </p>
              <p
                className="text-3xl font-extrabold"
                style={{ color: "#558B2F" }}
              >
                {stats.recentTransactions.length}
              </p>
              <span className="text-xs text-gray-400 mt-1">
                {stats.recentTransactions.length} recorded
              </span>
            </div>
          </div>


          {/* Crop Groups Filter Bar */}
            <div
              className="rounded-xl px-5 py-4 border shadow-sm flex flex-wrap items-center gap-3"
              style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
            >
              <span className="font-medium text-gray-700">Crop Groups</span>

              {CROP_GROUP_PILLS.map((pill) => {
                const isActive = selectedGroup === pill.key;

                const groupColors = {
                  vegetables: "#126B2C",
                  legumes: "#237F18",
                  cereals: "#D4AF17",
                };

                return (
                  <button
                    key={pill.key}
                    onClick={() =>
                      navigate("/seeds", { state: { cropGroup: pill.key } })
                    }
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none"
                    style={{
                      backgroundColor: isActive
                        ? groupColors[pill.key]
                        : "#F5F7F5",
                      color: isActive
                        ? pill.key === "cereals"
                          ? "#1B3300"
                          : "#FFFFFF"
                        : "#555",
                      border: isActive
                        ? `1px solid ${groupColors[pill.key]}`
                        : "1px solid #ddd",
                      boxShadow: isActive
                        ? "0 2px 6px rgba(0,0,0,0.15)"
                        : "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = groupColors[pill.key];
                        e.currentTarget.style.color =
                          pill.key === "cereals" ? "#1B3300" : "#FFFFFF";
                        e.currentTarget.style.border = `1px solid ${groupColors[pill.key]}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "#F5F7F5";
                        e.currentTarget.style.color = "#555";
                        e.currentTarget.style.border = "1px solid #ddd";
                      }
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

          {/* Recent Transactions Table */}
          <div
            className="rounded-xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
          >
            <div
              className="px-6 py-4 border-b flex items-center gap-2"
              style={{ borderColor: "#E0E0E0" }}
            >
              <h2
                className="text-base font-bold"
                style={{ color: "#1B5E20" }}
              >
                Recent Transactions
              </h2>
              {selectedGroup !== "all" && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                  style={{
                    backgroundColor:
                      selectedGroup === "cereals" ? "#FFF9C4" : "#E8F5E9",
                    color:
                      selectedGroup === "cereals" ? "#827717" : "#1B5E20",
                  }}
                >
                  {selectedGroup}
                </span>
              )}
            </div>

            {filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "#F9FBF9" }}>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Type
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Seed Lot
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Quantity
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Date
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        User
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#F0F4F0" }}>
                    {currentTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-green-50 transition-colors duration-100"
                      >
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getTypeBadge(transaction.type)}`}
                          >
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800 max-w-[180px] truncate">
                          {transaction.batch_name || transaction.seed_id || "—"}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {transaction.quantity ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {transaction.created_at
                            ? new Date(
                                transaction.created_at,
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          {getUserFullName(transaction)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <span className="text-4xl mb-2">🌿</span>
                <p className="text-sm font-medium">
                  No transactions found
                  {selectedGroup !== "all" ? ` for ${selectedGroup}` : ""}
                </p>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-white px-4 py-3 rounded-b-xl border-t border-[#E0E0E0]">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {getPageNumbers().map((page, idx) => (
                        page === "..." ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            aria-current={currentPage === page ? "page" : undefined}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition ${
                              currentPage === page
                                ? "z-10 bg-[#237F18] border-[#237F18] text-white"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════ RIGHT — SIDEBAR ══════════════════ */}
        <div className="flex flex-col gap-6">

          {/* Active Projects Card */}
          <div
            className="rounded-xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
          >
            <div
              className="px-5 py-4 border-b flex items-center gap-2"
              style={{ borderColor: "#E0E0E0" }}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: "#1B5E20" }}
              />
              <h2
                className="text-sm font-bold"
                style={{ color: "#1B5E20" }}
              >
                Active Projects
              </h2>
              <span
                className="ml-auto text-xs font-semibold rounded-full px-2 py-0.5"
                style={{ backgroundColor: "#E8F5E9", color: "#1B5E20" }}
              >
                {stats.projects.length}
              </span>
            </div>

            <div className="px-4 py-3">
              {stats.projects.length > 0 ? (
                <div className="space-y-2">
                  {stats.projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-green-50"
                      style={{ borderColor: "#E0E0E0" }}
                    >
                      <span className="text-lg mt-0.5 shrink-0">📁</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-800 text-xs truncate">
                            {project.name}
                          </p>
                          <span
                            className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "#E8F5E9",
                              color: "#1B5E20",
                            }}
                          >
                            Active
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-xs text-gray-500 leading-tight truncate">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {stats.projects.length > 5 && (
                    <p className="text-xs text-center text-gray-400 pt-1">
                      +{stats.projects.length - 5} more projects
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-xs py-4 text-center">
                  No active projects
                </p>
              )}
            </div>
          </div>

          {/* Active Users Card */}
          <div
            className="rounded-xl border shadow-sm overflow-hidden"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
          >
            <div
              className="px-5 py-4 border-b flex items-center gap-2"
              style={{ borderColor: "#E0E0E0" }}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-sm font-bold text-gray-800">
                Active Users
              </h2>
              <span className="ml-auto text-xs font-semibold rounded-full px-2 py-0.5 bg-blue-50 text-blue-700">
                {stats.activeUsers.length}
              </span>
            </div>

            <div className="px-4 py-3">
              {stats.activeUsers.length > 0 ? (
                <div className="space-y-2">
                  {stats.activeUsers.map((activeUser, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-blue-50"
                      style={{ borderColor: "#E0E0E0" }}
                    >
                      {/* Avatar with initials */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-sm shadow-sm"
                        style={{ backgroundColor: "#1B5E20" }}
                      >
                        {activeUser.firstName.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-xs">
                          {activeUser.firstName} {activeUser.lastName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last{" "}
                          {activeUser.lastActivity
                            ? new Date(
                                activeUser.lastActivity,
                              ).toLocaleTimeString()
                            : "—"}
                        </p>
                      </div>

                      {/* Online dot indicator */}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: "#E0C000" }}
                        title="Recently active"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs py-4 text-center">
                  No active users
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;