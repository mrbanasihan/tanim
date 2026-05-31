import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { filterByCropGroup } from "../utils/accessControl";
import { getSelectedCropGroup } from "../constants/cropCatalog";

// Dashboard
// Main dashboard page displaying statistics, recent transactions, projects, and active users; interacts with seeds, projects, and transactions APIs
function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSeeds: 0,
    totalProjects: 0,
    recentTransactions: [],
    projects: [],
    activeUsers: [],
  });
  const [loading, setLoading] = useState(true);

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

  // getFirstName
  // Extracts first name from user data
  const getFirstName = (userData) => {
    const fullName = getUserFullName(userData);
    if (fullName === "Unknown User") return fullName;
    return fullName.split(/\s+/)[0];
  };

  // getLastName
  // Extracts last name from user data
  const getLastName = (userData) => {
    const fullName = getUserFullName(userData);
    if (fullName === "Unknown User") return "";
    const parts = fullName.trim().split(/\s+/);
    return parts.length >= 2 ? parts[parts.length - 1] : "";
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const selectedGroup = getSelectedCropGroup(
          user?.role,
          user?.crop_groups,
        );
        const [seedsRes, projectsRes, transactionsRes] = await Promise.all([
          api.get("/seeds"),
          api.get(
            selectedGroup
              ? `/projects?crop_group=${selectedGroup}`
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

        // Extract unique users from recent transactions with first and last name
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

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome back, {user?.name || user?.email?.split("@")[0] || "User"}!
        </h1>
        <p className="text-gray-600">
          Manage your seed inventory, track transactions, and monitor your
          projects all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Total Seed Lots
          </h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalSeeds}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Total Projects
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.totalProjects}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">
            Recent Transactions
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats.recentTransactions.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Active Projects - Shows Project Names */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Active Projects
          </h2>
          {stats.projects.length > 0 ? (
            <div className="space-y-3">
              {stats.projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition"
                >
                  <p className="font-medium text-gray-800 text-sm">
                    📁 Project {project.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status:{" "}
                    <span className="text-green-600 font-semibold">
                      {project.status || "Active"}
                    </span>
                  </p>
                  {project.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
              {stats.projects.length > 5 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  +{stats.projects.length - 5} more projects
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No active projects</p>
          )}
        </div>

        {/* Active Users - Shows First and Last Name */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Active Users
          </h2>
          {stats.activeUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.activeUsers.map((activeUser, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Display First and Last Name */}
                      <p className="font-medium text-gray-800 text-sm">
                        👤 {activeUser.firstName} {activeUser.lastName}
                      </p>
                      {activeUser.email && (
                        <p className="text-xs text-gray-500 mt-1">
                          📧 {activeUser.email}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">
                        ⏱️ Last:{" "}
                        {new Date(activeUser.lastActivity).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full text-xs font-bold">
                      {activeUser.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No active users</p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <p className="text-xs text-gray-600 font-semibold">
              Active Projects
            </p>
            <p className="text-3xl font-bold text-green-600">
              {stats.projects.length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 font-semibold">Active Users</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.activeUsers.length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <p className="text-xs text-gray-600 font-semibold">
              Recent Activity
            </p>
            <p className="text-3xl font-bold text-purple-600">
              {stats.recentTransactions.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        {stats.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Seed Lot</th>
                  <th className="px-4 py-2 text-left">Quantity</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">User</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t">
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {transaction.batch_name || transaction.seed_id}
                    </td>
                    <td className="px-4 py-2">{transaction.quantity}</td>
                    <td className="px-4 py-2">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {getUserFullName(transaction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent transactions</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
