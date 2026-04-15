import React, { useState, useEffect } from "react";
import api from "../services/api";

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    seed_lot_id: "",
  });

  const normalizeTransaction = (transaction) => ({
    ...transaction,
    type: transaction.type || transaction.transaction_type,
    id: transaction.id || transaction.transaction_id,
    seed_id: transaction.seed_id || transaction.seed_lot_id,
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/transactions?${params}`);
      setTransactions(response.data.map(normalizeTransaction));
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
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Transaction History
          </h1>
          <p className="text-sm text-slate-500">
            Browse all seed lot transactions with filters for type and seed lot.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Transaction Type
              </span>
              <select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">All Types</option>
                <option value="outgoing">Check Out</option>
                <option value="incoming">Check In</option>
                <option value="disposal">Disposal</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Seed Lot ID
              </span>
              <input
                type="text"
                name="seed_lot_id"
                placeholder="Enter seed lot ID"
                value={filters.seed_lot_id}
                onChange={handleFilterChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
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
                              Seed Lot
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
                                  {transaction.seed_id}
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

              {(filters.type === "" || filters.type === "incoming") &&
                transactions.filter((t) => t.type === "incoming").length >
                  0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Check-in Transactions
                      </h3>
                      <span className="text-sm text-slate-500">
                        {
                          transactions.filter((t) => t.type === "incoming")
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
                              Seed Lot
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
                                  {transaction.seed_id}
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

              {(filters.type === "" || filters.type === "disposal") &&
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
                              Seed Lot
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
                                  {transaction.seed_id}
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
