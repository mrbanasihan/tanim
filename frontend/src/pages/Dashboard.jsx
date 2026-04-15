import { useState, useEffect } from "react";
import api from "../services/api";

function Dashboard() {
  const [stats, setStats] = useState({
    totalSeeds: 0,
    totalProjects: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);

  const normalizeTransaction = (transaction) => ({
    ...transaction,
    type: transaction.type || transaction.transaction_type,
    id: transaction.id || transaction.transaction_id,
    seed_id: transaction.seed_id || transaction.seed_lot_id,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [seedsRes, projectsRes, transactionsRes] = await Promise.all([
          api.get("/seeds"),
          api.get("/projects"),
          api.get("/transactions?limit=5"),
        ]);

        setStats({
          totalSeeds: seedsRes.data.length,
          totalProjects: projectsRes.data.length,
          recentTransactions: transactionsRes.data.map(normalizeTransaction),
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

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
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t">
                    <td className="px-4 py-2">{transaction.type}</td>
                    <td className="px-4 py-2">
                      {transaction.batch_name || transaction.seed_id}
                    </td>
                    <td className="px-4 py-2">{transaction.quantity}</td>
                    <td className="px-4 py-2">
                      {new Date(transaction.created_at).toLocaleDateString()}
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
