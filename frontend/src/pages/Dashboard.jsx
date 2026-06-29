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
          api.get("/transactions?limit=10"),
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
    { key: "all", label: "All" },
    { key: "vegetables", label: "Vegetables" },
    { key: "legumes", label: "Legumes" },
    { key: "cereals", label: "Cereals" },
  ];

  const filteredTransactions = stats.recentTransactions;
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
      {/* ── Two-column grid: 70 / 30 ─────────────────────────────────── */}
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
                Last 10 recorded
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
                  all: "#055E1F",
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
                    {filteredTransactions.map((transaction) => (
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
