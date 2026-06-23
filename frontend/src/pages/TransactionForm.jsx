import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { filterByCropGroup } from "../utils/accessControl";
import { toTitleCase } from "../utils/textFormat";

// TransactionForm
// Form to create or edit seed transactions (check-out or disposal); interacts with transactions and seeds APIs
const TransactionForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const seedLotId = searchParams.get("seed_lot_id");
  const isEditing = Boolean(id);

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
    fetchSeedLots();
    if (isEditing) {
      fetchTransaction();
    }
  }, [user?.role, user?.crop_groups, isEditing, id]);

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
      const response = await api.get(`/transactions/${id}`);
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

  // handleChange
  // Updates form data and syncs selected seed quantity
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle contact number formatting
    let formattedValue = value;
    if (name === "contact") {
      formattedValue = value.replace(/\D/g, "").slice(0, 11);
    }

    // Update form data
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    // Update selected seed quantity when seed_id changes
    if (name === "seed_id" && value) {
      const selectedSeed = seedLots.find((seed) => seed.seed_id === value);
      if (selectedSeed) {
        setSelectedSeedQuantity(parseFloat(selectedSeed.current_quantity || 0));
      } else {
        setSelectedSeedQuantity(0);
      }
    }
  };

  // handleSubmit
  // Validates and submits transaction form; creates check-out or disposal transaction
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

        await api.put(`/transactions/${id}`, payload);
        navigate("/transactions");
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

      navigate("/transactions");
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? "Edit Transaction" : "New Transaction"}
      </h1>

      <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                        : "text-green-600"
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
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Transaction"
                  : "Create Transaction"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/transactions")}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
