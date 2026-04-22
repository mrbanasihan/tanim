import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const TransactionHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    seed_lot_id: "",
    crop_type: "",
    variety: "",
  });
  const [sortType, setSortType] = useState("date"); // date, quantity
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [cropTypes, setCropTypes] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const navigate = useNavigate();

  const normalizeTransaction = (transaction) => ({
    ...transaction,
    type: transaction.type || transaction.transaction_type,
    id: transaction.id || transaction.transaction_id,
    seed_id: transaction.seed_id || transaction.seed_lot_id,
  });

  useEffect(() => {
    fetchDropdownData();
    fetchTransactions();
  }, [filters, sortType, sortOrder]);

  const fetchDropdownData = async () => {
    try {
      const response = await api.get("/seeds");
      const seedsData = response.data || [];

      // Get unique crop types
      const uniqueCropTypes = [
        ...new Set(seedsData.map((seed) => seed.crop_type).filter(Boolean)),
      ].sort();
      setCropTypes(uniqueCropTypes);

      // Get unique varieties
      const uniqueVarieties = [
        ...new Set(seedsData.map((seed) => seed.variety).filter(Boolean)),
      ].sort();
      setVarieties(uniqueVarieties);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const applySorting = (transactionsArray) => {
    if (!Array.isArray(transactionsArray)) return [];

    const sorted = [...transactionsArray];

    if (sortType === "date") {
      if (sortOrder === "asc") {
        return sorted.sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
      } else {
        return sorted.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
      }
    } else if (sortType === "quantity") {
      if (sortOrder === "asc") {
        return sorted.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      } else {
        return sorted.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      }
    }

    return sorted;
  };

  const toggleSort = (type) => {
    if (sortType === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortType(type);
      setSortOrder("desc");
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/transactions?${params}`);
      let transactionsData = response.data.map(normalizeTransaction);
      if (user?.role === "guest") {
        transactionsData = transactionsData.filter(
          (transaction) => transaction.type === "outgoing",
        );
      }
      transactionsData = applySorting(transactionsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">
                Transaction History
              </h1>
              <p className="text-sm text-slate-500">
                Browse all seed lot transactions with filters for type and seed
                lot.
              </p>
            </div>
            <button
              onClick={() => navigate("/transactions/new")}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
            >
              Add New Transaction
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-fit">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">
                  Transaction Type
                </span>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="outgoing">Check Out</option>
                  {user?.role !== "guest" && (
                    <option value="disposal">Disposal</option>
                  )}
                </select>
              </label>
            </div>
            <div className="flex-1 min-w-fit">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">
                  Crop Type
                </span>
                <select
                  name="crop_type"
                  value={filters.crop_type}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                >
                  <option value="">All Crops</option>
                  {cropTypes.map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex-1 min-w-fit">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">
                  Variety
                </span>
                <select
                  name="variety"
                  value={filters.variety}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                >
                  <option value="">All Varieties</option>
                  {varieties.map((variety) => (
                    <option key={variety} value={variety}>
                      {variety}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex-1 min-w-fit">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 mb-1 block">
                  Batch Name
                </span>
                <input
                  type="text"
                  name="seed_lot_id"
                  placeholder="Search..."
                  value={filters.seed_lot_id}
                  onChange={handleFilterChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                />
              </label>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => toggleSort("date")}
                className={`px-2 py-2 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                  sortType === "date"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={
                  sortType === "date" && sortOrder === "asc"
                    ? "Oldest first"
                    : "Newest first"
                }
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {sortType === "date" && sortOrder === "desc" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  )}
                </svg>
                <span className="text-xs">Date</span>
              </button>
              <button
                onClick={() => toggleSort("quantity")}
                className={`px-2 py-2 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                  sortType === "quantity"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={
                  sortType === "quantity" && sortOrder === "asc"
                    ? "Lowest first"
                    : "Highest first"
                }
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {sortType === "quantity" && sortOrder === "desc" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  )}
                </svg>
                <span className="text-xs">Qty</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          {transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No transactions found
            </div>
          ) : (
            <div className="space-y-8">
              {(filters.type === "" || filters.type === "outgoing") &&
                transactions.filter((t) => t.type === "outgoing").length >
                  0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Check-out Transactions
                      </h3>
                      <span className="text-sm text-slate-500">
                        {
                          transactions.filter((t) => t.type === "outgoing")
                            .length
                        }{" "}
                        records
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-3xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 table-auto">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Batch Name
                            </th>
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
                                  {transaction.batch_name ||
                                    transaction.seed_id}
                                </td>
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

              {/* Check-in transactions removed */}
              {false && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Check-in Transactions
                    </h3>
                    <span className="text-sm text-slate-500">{0} records</span>
                  </div>
                  <div className="overflow-x-auto rounded-3xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 table-auto">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Batch Name
                          </th>
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
                          .filter((t) => t.type === "incoming")
                          .map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {transaction.batch_name || transaction.seed_id}
                              </td>
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

              {user?.role !== "guest" &&
                (filters.type === "" || filters.type === "disposal") &&
                transactions.filter((t) => t.type === "disposal").length >
                  0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Disposal Transactions
                      </h3>
                      <span className="text-sm text-slate-500">
                        {
                          transactions.filter((t) => t.type === "disposal")
                            .length
                        }{" "}
                        records
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-3xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 table-auto">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Batch Name
                            </th>
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
                                  {transaction.batch_name ||
                                    transaction.seed_id}
                                </td>
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

export default TransactionHistory;
