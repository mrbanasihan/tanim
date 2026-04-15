import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

const SeedDetail = () => {
  const { id } = useParams();
  const [seed, setSeed] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeTransaction = (transaction) => ({
    ...transaction,
    type: transaction.type || transaction.transaction_type,
    id: transaction.id || transaction.transaction_id,
    seed_id: transaction.seed_id || transaction.seed_lot_id,
  });

  useEffect(() => {
    fetchSeedData();
  }, [id]);

  const fetchSeedData = async () => {
    try {
      const [seedResponse, transactionsResponse] = await Promise.all([
        api.get(`/seeds/${id}`),
        api.get(`/seeds/${id}/transactions`),
      ]);
      setSeed(seedResponse.data);
      setTransactions(transactionsResponse.data.map(normalizeTransaction));
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seed Lot Details</h1>
        <div className="space-x-2">
          <Link
            to={`/seeds/${id}/edit`}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Lot Number
            </label>
            <p className="mt-1 text-sm text-gray-900">{seed.batch_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Crop Type
            </label>
            <p className="mt-1 text-sm text-gray-900">{seed.crop_type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Variety
            </label>
            <p className="mt-1 text-sm text-gray-900">{seed.variety}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Classification
            </label>
            <p className="mt-1 text-sm text-gray-900">{seed.classification}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Germination Rate (%)
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {seed.germination_rate}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Initial Quantity (kg)
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {seed.initial_quantity}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cleaned Quantity (kg)
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {seed.cleaned_quantity}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Quantity (kg)
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {seed.current_quantity}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Number of Packets
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {seed.number_of_packets}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Weight per Packet (kg)
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {seed.weight_per_packet}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Others (kg)
            </label>
            <p className="mt-1 text-sm text-gray-900">{seed.others}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Storage Area
            </label>
            <p className="mt-1 text-sm text-gray-900">{seed.storage_area}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {seed.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          {seed.project_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project
              </label>
              <p className="mt-1 text-sm text-gray-900">{seed.project_name}</p>
            </div>
          )}
        </div>
        {seed.remarks && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Remarks
            </label>
            <p className="mt-1 text-sm text-gray-900">{seed.remarks}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <Link
            to={`/transactions/new?seed_lot_id=${id}`}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Add Transaction
          </Link>
        </div>

        {/* Check-out Transactions */}
        {transactions.filter((t) => t.type === "outgoing").length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Check-out Transactions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Recipient</th>
                    <th className="px-4 py-2 text-left">Purpose</th>
                    <th className="px-4 py-2 text-left">Affiliation</th>
                    <th className="px-4 py-2 text-left">Contact</th>
                    <th className="px-4 py-2 text-left">Remarks</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter((t) => t.type === "outgoing")
                    .map((transaction) => (
                      <tr key={transaction.transaction_id} className="border-t">
                        <td className="px-4 py-2">{transaction.quantity}</td>
                        <td className="px-4 py-2">
                          {transaction.recipient || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {transaction.purpose || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {transaction.affiliation || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {transaction.contact || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {transaction.remarks || "-"}
                        </td>
                        <td className="px-4 py-2">
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

        {/* Check-in Transactions */}
        {transactions.filter((t) => t.type === "incoming").length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Check-in Transactions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Remarks</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter((t) => t.type === "incoming")
                    .map((transaction) => (
                      <tr key={transaction.transaction_id} className="border-t">
                        <td className="px-4 py-2">{transaction.quantity}</td>
                        <td className="px-4 py-2">
                          {transaction.remarks || "-"}
                        </td>
                        <td className="px-4 py-2">
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
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Disposal Transactions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Purpose</th>
                    <th className="px-4 py-2 text-left">Remarks</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter((t) => t.type === "disposal")
                    .map((transaction) => (
                      <tr key={transaction.transaction_id} className="border-t">
                        <td className="px-4 py-2">{transaction.quantity}</td>
                        <td className="px-4 py-2">
                          {transaction.purpose || "-"}
                        </td>
                        <td className="px-4 py-2">
                          {transaction.remarks || "-"}
                        </td>
                        <td className="px-4 py-2">
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

        {transactions.length === 0 && (
          <p className="text-gray-500">No transactions found</p>
        )}
      </div>
    </div>
  );
};

export default SeedDetail;
