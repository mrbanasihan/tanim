import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

const TransactionForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seedLotId = searchParams.get("seed_lot_id");

  const [formData, setFormData] = useState({
    type: "check-out",
    seed_id: seedLotId || "",
    number_of_packets: "",
    recipient: "",
    purpose: "",
    affiliation: "",
    contact: "",
    remarks: "",
  });
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [seedLots, setSeedLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSeedLots();
  }, []);

  const fetchSeedLots = async () => {
    try {
      const response = await api.get("/seeds");
      setSeedLots(response.data);
    } catch (error) {
      console.error("Error fetching seed lots:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "seed_id") {
      const seed = seedLots.find((s) => s.seed_id === value);
      setSelectedSeed(seed || null);
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
      } else if (formData.type === "check-in") {
        endpoint += "/check-in";
      } else if (formData.type === "disposal") {
        endpoint += "/disposal";
      }

      const payload = {
        seed_id: formData.seed_id,
        quantity:
          selectedSeed && selectedSeed.weight_per_packet
            ? parseFloat(formData.number_of_packets) *
              parseFloat(selectedSeed.weight_per_packet)
            : parseFloat(formData.number_of_packets),
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
              <option value="check-in">Check In</option>
              <option value="disposal">Disposal</option>
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
                  {seed.weight_per_packet &&
                    ` (${seed.weight_per_packet}kg/packet)`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Packets
            </label>
            <input
              type="number"
              name="number_of_packets"
              value={formData.number_of_packets}
              onChange={handleChange}
              required
              min="1"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedSeed && selectedSeed.weight_per_packet && (
              <p className="text-xs text-gray-500 mt-1">
                Weight per packet: {selectedSeed.weight_per_packet} kg
              </p>
            )}
          </div>

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
