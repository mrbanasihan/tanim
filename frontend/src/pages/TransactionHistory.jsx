import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { filterByCropGroup } from "../utils/accessControl";

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
  const [sortType, setSortType] = useState("name"); // name, date, quantity
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [cropTypes, setCropTypes] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [cropVarietyMap, setCropVarietyMap] = useState({});
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
  }, [filters, sortType, sortOrder, user?.role, user?.crop_groups]);

  const fetchDropdownData = async () => {
    try {
      const response = await api.get("/seeds");
      const seedsData = filterByCropGroup(
        response.data || [],
        user?.role,
        user?.crop_groups,
      );

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

      const nextCropVarietyMap = {};
      seedsData.forEach((seed) => {
        if (!seed?.crop_type || !seed?.variety) return;
        if (!nextCropVarietyMap[seed.crop_type]) {
          nextCropVarietyMap[seed.crop_type] = new Set();
        }
        nextCropVarietyMap[seed.crop_type].add(seed.variety);
      });

      const normalizedCropVarietyMap = {};
      Object.entries(nextCropVarietyMap).forEach(([crop, varietySet]) => {
        normalizedCropVarietyMap[crop] = Array.from(varietySet).sort();
      });
      setCropVarietyMap(normalizedCropVarietyMap);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
      setCropVarietyMap({});
    }
  };

  const applySorting = (transactionsArray) => {
    if (!Array.isArray(transactionsArray)) return [];

    const sorted = [...transactionsArray];

    if (sortType === "name") {
      if (sortOrder === "asc") {
        return sorted.sort((a, b) =>
          (a.batch_name || a.seed_id || "").localeCompare(
            b.batch_name || b.seed_id || "",
          ),
        );
      }
      return sorted.sort((a, b) =>
        (b.batch_name || b.seed_id || "").localeCompare(
          a.batch_name || a.seed_id || "",
        ),
      );
    } else if (sortType === "date") {
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
      let transactionsData = filterByCropGroup(
        response.data.map(normalizeTransaction),
        user?.role,
        user?.crop_groups,
      );
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
    setFilters((prev) => {
      if (name === "crop_type") {
        return { ...prev, crop_type: value, variety: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const visibleVarieties = filters.crop_type
    ? cropVarietyMap[filters.crop_type] || []
    : varieties;

  const clearAllFilters = () => {
    setFilters({
      type: "",
      seed_lot_id: "",
      crop_type: "",
      variety: "",
    });
    setSortType("name");
    setSortOrder("desc");
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

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-4">
            <div className="flex flex-wrap lg:flex-nowrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="seed_lot_id"
                    placeholder="Search transactions..."
                    value={filters.seed_lot_id}
                    onChange={handleFilterChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  />
                  {filters.seed_lot_id && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, seed_lot_id: "" }))
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-5 w-5 text-gray-400 hover:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative dropdown-container w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crop Type
                </label>
                <div className="relative">
                  <select
                    name="crop_type"
                    value={filters.crop_type}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">All Crops</option>
                    {cropTypes.map((crop) => (
                      <option key={crop} value={crop}>
                        {crop}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative dropdown-container w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variety
                </label>
                <div className="relative">
                  <select
                    name="variety"
                    value={filters.variety}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">All Varieties</option>
                    {visibleVarieties.map((variety) => (
                      <option key={variety} value={variety}>
                        {variety}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSort("name")}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                      sortType === "name"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    title={
                      sortType === "name" && sortOrder === "asc"
                        ? "Sort Z-A"
                        : "Sort A-Z"
                    }
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {sortType === "name" && sortOrder === "asc" ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                        />
                      ) : sortType === "name" && sortOrder === "desc" ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h9m5-4l4 4m0 0l4-4m-4 4V4"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                        />
                      )}
                    </svg>
                    <span className="text-sm">Name</span>
                  </button>
                  <button
                    onClick={() => toggleSort("date")}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
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
                    <span className="text-sm">Date</span>
                  </button>
                  <button
                    onClick={() => toggleSort("quantity")}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
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
                    <span className="text-sm">Qty</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">
                  Clear
                </label>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition text-sm whitespace-nowrap"
                >
                  Clear All
                </button>
              </div>
            </div>

            {(filters.type ||
              filters.seed_lot_id ||
              filters.crop_type ||
              filters.variety) && (
              <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 mr-1 font-medium">
                  Active filters:
                </span>
                {filters.type && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Type: {filters.type}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, type: "" }))
                      }
                      className="ml-1.5 hover:text-blue-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.seed_lot_id && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Search: {filters.seed_lot_id}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, seed_lot_id: "" }))
                      }
                      className="ml-1.5 hover:text-green-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.crop_type && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Crop: {filters.crop_type}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          crop_type: "",
                          variety: "",
                        }))
                      }
                      className="ml-1.5 hover:text-purple-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.variety && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    Variety: {filters.variety}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, variety: "" }))
                      }
                      className="ml-1.5 hover:text-yellow-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
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
