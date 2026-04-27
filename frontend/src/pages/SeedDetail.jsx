import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const SeedDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [seed, setSeed] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [germinationRecords, setGerminationRecords] = useState([]);
  const [latestGermination, setLatestGermination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canEditSeed = ["admin", "staff"].includes(user?.role);
  const canDeleteSeed = user?.role === "admin";

  const normalizeTransaction = (transaction) => ({
    ...transaction,
    type: transaction.type || transaction.transaction_type,
    id: transaction.id || transaction.transaction_id,
    seed_id: transaction.seed_id || transaction.seed_lot_id,
  });

  useEffect(() => {
    // Refresh data when the tab becomes visible again (returning from transaction form)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchSeedData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id]);

  const fetchSeedData = async () => {
    try {
      const [seedResponse, transactionsResponse, germinationResponse] =
        await Promise.all([
          api.get(`/seeds/${id}`),
          api.get(`/seeds/${id}/transactions`),
          api.get(`/seeds/${id}/germination-records`),
        ]);
      setSeed(seedResponse.data);
      setTransactions(transactionsResponse.data.map(normalizeTransaction));

      // Fetch germination records
      const records = germinationResponse.data || [];
      console.log("Germination records:", records);
      setGerminationRecords(records);

      // Get the most recent germination record
      if (records.length > 0) {
        const sorted = [...records].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        setLatestGermination(sorted[0]);
      }
    } catch (error) {
      console.error("Error fetching seed data:", error);
      setError("Failed to load seed data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this seed lot?")) {
      try {
        await api.delete(`/seeds/${id}`);
        // Redirect to seed list
        window.location.href = "/seeds";
      } catch (error) {
        console.error("Error deleting seed:", error);
        setError("Failed to delete seed lot");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (!seed) {
    return <div className="text-center py-8">Seed lot not found</div>;
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 flex-1 mr-4">
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">
              Seed Lot Details
            </h1>
            <p className="text-sm text-slate-500">
              Detailed information and transaction history for seed lot{" "}
              {seed.batch_name}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to={`/seeds/${id}/germination`}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Record Germination</span>
            </Link>
            {canEditSeed && (
              <Link
                to={`/seeds/${id}/edit`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>Edit</span>
              </Link>
            )}
            {canDeleteSeed && (
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Lot Number
              </label>
              <p className="text-lg font-medium text-slate-900">
                {seed.batch_name}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Crop Type
              </label>
              <p className="text-lg font-medium text-slate-900">
                {seed.crop_type}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Variety
              </label>
              <p className="text-lg font-medium text-slate-900">
                {seed.variety}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Classification
              </label>
              <p className="text-lg font-medium text-slate-900">
                {seed.classification}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Moisture Content (%)
              </label>
              <p className="text-lg font-medium text-slate-900">
                {seed.moisture_content ?? "-"}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Gross Weight (kg)
              </label>
              <p className="text-lg font-medium text-green-600 font-bold">
                {seed.gross_weight}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Cleaned Weight (kg)
              </label>
              <p className="text-lg font-medium text-blue-600 font-bold">
                {seed.cleaned_quantity}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Current Weight (kg)
              </label>
              <p className="text-lg font-medium text-purple-600 font-bold">
                {seed.current_quantity}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Area Planted
              </label>
              <p className="text-lg font-medium text-slate-900">
                {seed.area_planted || "-"}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Storage Area
              </label>
              <p className="text-lg font-medium text-slate-900">
                {seed.storage_area || "-"}
              </p>
            </div>
            {seed.project_name && (
              <div className="bg-slate-50 p-4 rounded-2xl">
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Project
                </label>
                <p className="text-lg font-medium text-slate-900">
                  {seed.project_name}
                </p>
              </div>
            )}
            {latestGermination && (
              <div className="bg-slate-50 p-4 rounded-2xl">
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Latest Germination Rate
                </label>
                <p className="text-lg font-medium text-orange-600 font-bold">
                  {latestGermination.germination_rate}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(latestGermination.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          {seed.remarks && (
            <div className="mt-6 bg-slate-50 p-4 rounded-2xl">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Remarks
              </label>
              <p className="text-slate-900">{seed.remarks}</p>
            </div>
          )}
        </div>

        {/* Germination Records Section */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Germination Records
            </h2>
            <span className="text-sm text-slate-500">
              {germinationRecords.length} records
            </span>
          </div>

          {germinationRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No records found
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 table-auto">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Germination Rate (%)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Next Germination Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Recorded By
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Date Recorded
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {germinationRecords
                    .sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at),
                    )
                    .map((record) => (
                      <tr
                        key={record.germination_id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700 font-semibold text-orange-600">
                          {record.germination_rate}%
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {record.next_germination_date
                            ? new Date(
                                record.next_germination_date,
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {record.first_name && record.last_name
                            ? `${record.first_name} ${record.last_name}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {new Date(record.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Transaction History
            </h2>
            <Link
              to={`/transactions/new?seed_lot_id=${id}`}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Add Transaction</span>
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No transactions found
            </div>
          ) : (
            <div className="space-y-8">
              {/* Check-out Transactions */}
              {transactions.filter((t) => t.type === "outgoing").length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Check-out Transactions
                    </h3>
                    <span className="text-sm text-slate-500">
                      {transactions.filter((t) => t.type === "outgoing").length}{" "}
                      records
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 table-auto">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Recipient
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Purpose
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Affiliation
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {transactions
                          .filter((t) => t.type === "outgoing")
                          .map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.recipient || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.purpose || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.affiliation || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.contact || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.remarks || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {new Date(
                                  transaction.created_at,
                                ).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Disposal Transactions */}
              {transactions.filter(
                (t) => t.type === "damaged" || t.type === "return",
              ).length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Other Transactions
                    </h3>
                    <span className="text-sm text-slate-500">
                      {
                        transactions.filter(
                          (t) => t.type === "damaged" || t.type === "return",
                        ).length
                      }{" "}
                      records
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 table-auto">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {transactions
                          .filter(
                            (t) => t.type === "damaged" || t.type === "return",
                          )
                          .map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.remarks || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {new Date(
                                  transaction.created_at,
                                ).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Disposal Transactions */}
              {transactions.filter((t) => t.type === "disposal").length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Disposal Transactions
                    </h3>
                    <span className="text-sm text-slate-500">
                      {transactions.filter((t) => t.type === "disposal").length}{" "}
                      records
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 table-auto">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Quantity
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Purpose
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {transactions
                          .filter((t) => t.type === "disposal")
                          .map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.purpose || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.remarks || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {new Date(
                                  transaction.created_at,
                                ).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeedDetail;
