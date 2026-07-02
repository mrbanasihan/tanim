import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { filterByCropGroup } from "../utils/accessControl";
import { toTitleCase } from "../utils/textFormat";

// TransactionForm
// Modal to create or edit seed transactions (check-out or disposal); interacts with transactions and seeds APIs
const TransactionForm = ({ isOpen, transactionId, seedLotId, onClose, onSaveSuccess }) => {
  const { user } = useAuth();
  const isEditing = Boolean(transactionId);

  const [formData, setFormData] = useState({
    type: "check-out",
    seed_id: seedLotId || "",
    quantity: "",
    recipient: "",
    purpose: "",
    affiliation: "",
    contact: "",
    remarks: "",
  });
  const [seedLots, setSeedLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSeedQuantity, setSelectedSeedQuantity] = useState(0);
  const isGuest = user?.role === "guest";
  const canManageTransactionActions = ["admin", "researcher"].includes(
    user?.role,
  );

  useEffect(() => {
    if (!isOpen) return;

    fetchSeedLots();
    if (isEditing) {
      fetchTransaction();
    } else {
      setFormData({
        type: "check-out",
        seed_id: seedLotId || "",
        quantity: "",
        recipient: "",
        purpose: "",
        affiliation: "",
        contact: "",
        remarks: "",
      });
      setError("");
    }
  }, [isOpen, transactionId, seedLotId, user]);

  useEffect(() => {
    if (seedLots.length > 0 && formData.seed_id) {
      const selectedSeed = seedLots.find(
        (seed) => seed.seed_id === formData.seed_id,
      );
      if (selectedSeed) {
        const quantity = selectedSeed.current_quantity || 0;
        setSelectedSeedQuantity(parseFloat(quantity));
      } else {
        setSelectedSeedQuantity(0);
      }
      return;
    }

    setSelectedSeedQuantity(0);
  }, [seedLots, formData.seed_id]);

  const fetchTransaction = async () => {
    try {
      const response = await api.get(`/transactions/${transactionId}`);
      const tx = response.data;

      setFormData({
        type: tx.transaction_type === "disposal" ? "disposal" : "check-out",
        seed_id: tx.seed_id || "",
        quantity: tx.quantity || "",
        recipient: tx.recipient || "",
        purpose: tx.purpose || "",
        affiliation: tx.affiliation || "",
        contact: tx.contact || "",
        remarks: tx.remarks || "",
      });
    } catch (err) {
      console.error("Error fetching transaction:", err);
      setError(err.response?.data?.error || "Failed to load transaction");
    }
  };

  const fetchSeedLots = async () => {
    try {
      const response = await api.get("/seeds");
      let seeds = response.data || [];

      // Filter by crop group based on user role
      seeds = filterByCropGroup(seeds, user?.role, user?.crop_groups);
      setSeedLots(seeds);
    } catch (error) {
      console.error("Error fetching seed lots:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let formattedValue = value;
    if (name === "contact") {
      formattedValue = value.replace(/\D/g, "").slice(0, 11);
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    if (name === "seed_id" && value) {
      const selectedSeed = seedLots.find((seed) => seed.seed_id === value);
      if (selectedSeed) {
        setSelectedSeedQuantity(parseFloat(selectedSeed.current_quantity || 0));
      } else {
        setSelectedSeedQuantity(0);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isEditing && !canManageTransactionActions) {
      setError("Only admin and researcher can edit transactions");
      setLoading(false);
      return;
    }

    try {
      if (isEditing) {
        const payload = {
          recipient: formData.recipient,
          purpose: formData.purpose,
          affiliation: formData.affiliation,
          contact: formData.contact,
          remarks: formData.remarks,
        };

        await api.put(`/transactions/${transactionId}`, payload);
        if (onSaveSuccess) onSaveSuccess();
        return;
      }

      let endpoint = "/transactions";
      if (formData.type === "check-out") {
        endpoint += "/check-out";
      } else if (formData.type === "disposal") {
        if (isGuest) {
          setError("Guests can only create check-out transactions");
          setLoading(false);
          return;
        }
        endpoint += "/disposal";
      }

      const payload = {
        seed_id: formData.seed_id,
        quantity: parseFloat(formData.quantity),
      };

      if (formData.type === "check-out") {
        payload.recipient = formData.recipient;
        payload.purpose = formData.purpose;
        payload.affiliation = formData.affiliation;
        payload.contact = formData.contact;
      } else if (formData.type === "disposal") {
        payload.purpose = formData.purpose;
      }

      payload.remarks = formData.remarks;

      await api.post(endpoint, payload);

      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("Error creating transaction:", error);
      setError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to create transaction",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? "Edit Transaction" : "New Transaction"}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={isEditing}
              className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] ${
                isEditing
                  ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                  : "bg-white"
              }`}
            >
              <option value="check-out">Check Out</option>
              {!isGuest && <option value="disposal">Disposal</option>}
            </select>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Transaction type cannot be changed after creation.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seed Lot
            </label>
            <select
              name="seed_id"
              value={formData.seed_id}
              onChange={handleChange}
              required
              disabled={isEditing}
              className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] ${
                isEditing
                  ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                  : "bg-white"
              }`}
            >
              <option value="">Select a seed lot</option>
              {seedLots.map((seed) => (
                <option key={seed.seed_id} value={seed.seed_id}>
                  {toTitleCase(seed.batch_name)} - {toTitleCase(seed.crop_type)}{" "}
                  {toTitleCase(seed.variety)}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Seed lot cannot be changed after transaction is created.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (kg)
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              inputMode="decimal"
              readOnly={isEditing}
              className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] ${
                isEditing
                  ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                  : "bg-white"
              }`}
            />
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Quantity cannot be changed after transaction is created.
              </p>
            )}
          </div>

          {formData.seed_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Current Quantity:</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(selectedSeedQuantity || 0).toFixed(2)} kg
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Quantity After Transaction:</p>
                  <p
                    className={`text-lg font-semibold ${
                      formData.quantity &&
                      parseFloat(formData.quantity) >
                        (selectedSeedQuantity || 0)
                        ? "text-red-600"
                        : "text-[#116B2B]"
                    }`}
                  >
                    {(
                      (selectedSeedQuantity || 0) -
                      (formData.quantity ? parseFloat(formData.quantity) : 0)
                    ).toFixed(2)}{" "}
                    kg
                  </p>
                </div>
              </div>
              {formData.quantity &&
                parseFloat(formData.quantity) > (selectedSeedQuantity || 0) && (
                  <p className="text-red-600 text-sm mt-2 font-medium">
                    ⚠️ Insufficient quantity available
                  </p>
                )}
            </div>
          )}

          {formData.type === "check-out" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient
                </label>
                <input
                  type="text"
                  name="recipient"
                  value={formData.recipient}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <input
                  type="text"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Affiliation
                </label>
                <input
                  type="text"
                  name="affiliation"
                  value={formData.affiliation}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={11}
                  pattern="09[0-9]{9}"
                  title="Contact number must be 11 digits and start with 09"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
                />
              </div>
            </>
          )}

          {formData.type === "disposal" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose
              </label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows="3"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
            />
          </div>

          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#116B2B] hover:bg-[#0e5c24] text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
