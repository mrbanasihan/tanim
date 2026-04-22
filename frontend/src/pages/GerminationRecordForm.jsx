import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const GerminationRecordForm = () => {
  const { seedId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    germination_rate: "",
    next_germination_date: "",
  });
  const [seed, setSeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSeed();
  }, [seedId]);

  const fetchSeed = async () => {
    try {
      const response = await api.get(`/seeds/${seedId}`);
      setSeed(response.data);
    } catch (error) {
      console.error("Error fetching seed:", error);
      setError("Failed to load seed data");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (!formData.germination_rate || formData.germination_rate === "") {
        setError("Germination rate is required");
        setLoading(false);
        return;
      }

      const germinationRate = parseFloat(formData.germination_rate);
      if (germinationRate < 0 || germinationRate > 100) {
        setError("Germination rate must be between 0 and 100");
        setLoading(false);
        return;
      }

      await api.post("/germination-records", {
        seed_id: seedId,
        germination_rate: germinationRate,
        next_germination_date: formData.next_germination_date || null,
      });

      setSuccess(true);
      setFormData({
        germination_rate: "",
        next_germination_date: "",
      });

      // Redirect back to seed detail after 2 seconds
      setTimeout(() => {
        navigate(`/seeds/${seedId}`);
      }, 2000);
    } catch (error) {
      console.error("Error saving germination record:", error);
      setError(
        error.response?.data?.error || "Failed to save germination record",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!seed) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Record Germination Test</h1>
        <p className="text-gray-600 mb-6">
          Lot: <span className="font-semibold">{seed.batch_name}</span> | Crop:{" "}
          <span className="font-semibold">{seed.crop_type}</span>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              Germination record saved successfully! Redirecting...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Germination Rate (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="germination_rate"
              value={formData.germination_rate}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              required
              placeholder="Enter germination rate (0-100)"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Percentage of seeds that germinated
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Germination Test Date
            </label>
            <input
              type="date"
              name="next_germination_date"
              value={formData.next_germination_date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: When to perform the next germination test
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? "Saving..." : "Save Germination Record"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/seeds/${seedId}`)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GerminationRecordForm;
