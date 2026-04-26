import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { filterByCropGroup } from "../utils/accessControl";

const TransactionForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seedLotId = searchParams.get("seed_lot_id");

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

  useEffect(() => {
    fetchSeedLots();
  }, [user?.role, user?.crop_groups]);

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
    setFormData((prev) => ({ ...prev, [name]: value }));

    // When seed_id changes, fetch and display current quantity
    if (name === "seed_id" && value) {
      try {
        const selectedSeed = seedLots.find((seed) => seed.seed_id === value);
        if (selectedSeed) {
          const quantity = selectedSeed.current_quantity || 0;
          setSelectedSeedQuantity(parseFloat(quantity));
        } else {
          setSelectedSeedQuantity(0);
        }
      } catch (error) {
        console.error("Error setting seed quantity:", error);
        setSelectedSeedQuantity(0);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
      setError(error.response?.data?.message || "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">New Transaction</h1>

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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="check-out">Check Out</option>
              {!isGuest && <option value="disposal">Disposal</option>}
            </select>
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a seed lot</option>
              {seedLots.map((seed) => (
                <option key={seed.seed_id} value={seed.seed_id}>
                  {seed.batch_name} - {seed.crop_type} {seed.variety}
                </option>
              ))}
            </select>
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
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
              {loading ? "Creating..." : "Create Transaction"}
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
