import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const SeedForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    crop_type: "",
    variety: "",
    classification: "",
    germination_rate: "",
    has_project: false,
    project_id: "",
    initial_quantity: "",
    cleaned_quantity: "",
    number_of_packets: "",
    weight_per_packet: "",
    others: "",
    storage_area: "",
    remarks: "",
  });
  const [projects, setProjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cropTypes = ["soybean", "mungbean", "peanut"];
  const varietiesByType = {
    soybean: [
      "Tiwala 6",
      "Tiwala 8",
      "Tiwala 10",
      "Tiwala 12",
      "Tiwala 14",
      "Tiwala 20",
      "Tiwala 22",
      "Tiwala 24",
      "Tiwala 26",
      "Select Tudela Black",
      "Select Manchuria",
    ],
    mungbean: [
      "Pagasa 1",
      "Pagasa 3",
      "Pagasa 5",
      "Pagasa 7",
      "Pagasa 9",
      "Pagasa 11",
      "Pagasa 15",
      "PHL 14295",
      "PHL 14296",
      "PHL 12636",
    ],
    peanut: [
      "Biyaya 2",
      "Biyaya 4",
      "Biyaya 6",
      "Biyaya 8",
      "Biyaya 10",
      "Biyaya 12",
      "Biyaya 14",
      "Biyaya 16",
      "Sibalom",
    ],
  };
  const classifications = [
    "nucleus",
    "breeder",
    "foundation",
    "registered",
    "certified",
    "good seed",
  ];

  useEffect(() => {
    fetchProjects();
    fetchRooms();
    if (isEditing) {
      fetchSeed();
    }
  }, [id]);

  const fetchProjects = async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get("/rooms");
      const roomsData = Array.isArray(response.data)
        ? response.data
        : response.data?.rows || [];
      setRooms(roomsData);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchSeed = async () => {
    try {
      const response = await api.get(`/seeds/${id}`);
      const data = response.data;
      setFormData({
        crop_type: data.crop_type,
        variety: data.variety,
        classification: data.classification,
        germination_rate: data.germination_rate,
        has_project: !!data.project_id,
        project_id: data.project_id || "",
        initial_quantity: data.initial_quantity,
        cleaned_quantity: data.cleaned_quantity,
        number_of_packets: data.number_of_packets,
        weight_per_packet: data.weight_per_packet,
        others: data.others || "0.00",
        storage_area: data.storage_area,
        remarks: data.remarks,
      });
    } catch (error) {
      console.error("Error fetching seed:", error);
      setError("Failed to load seed data");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const sanitizedValue = type === "checkbox" ? checked : value;
    const newFormData = {
      ...formData,
      [name]: sanitizedValue,
    };

    if (name === "crop_type") {
      newFormData.variety = "";
    }

    if (name === "has_project" && !checked) {
      newFormData.project_id = "";
    }

    if (
      ["number_of_packets", "weight_per_packet", "cleaned_quantity"].includes(
        name,
      )
    ) {
      const packets = parseFloat(newFormData.number_of_packets) || 0;
      const weightPerPacket = parseFloat(newFormData.weight_per_packet) || 0;
      const cleanedQty = parseFloat(newFormData.cleaned_quantity) || 0;
      const others = packets * weightPerPacket - cleanedQty;
      newFormData.others = others >= 0 ? others.toFixed(2) : "0.00";
    }

    setFormData(newFormData);
  };

  useEffect(() => {
    const packets = parseFloat(formData.number_of_packets) || 0;
    const weightPerPacket = parseFloat(formData.weight_per_packet) || 0;
    const cleanedQty = parseFloat(formData.cleaned_quantity) || 0;
    const others = packets * weightPerPacket - cleanedQty;
    const formattedOthers = others >= 0 ? others.toFixed(2) : "0.00";

    if (formattedOthers !== formData.others) {
      setFormData((prev) => ({
        ...prev,
        others: formattedOthers,
      }));
    }
  }, [
    formData.number_of_packets,
    formData.weight_per_packet,
    formData.cleaned_quantity,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const submitData = {
      ...formData,
      project_id: formData.has_project ? formData.project_id : null,
    };

    try {
      if (isEditing) {
        await api.put(`/seeds/${id}`, submitData);
      } else {
        await api.post("/seeds", submitData);
      }
      navigate("/seeds");
    } catch (error) {
      console.error("Error saving seed:", error);
      setError(error.response?.data?.message || "Failed to save seed lot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? "Edit Seed Lot" : "Add New Seed Lot"}
      </h1>

      <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crop Type
            </label>
            <select
              name="crop_type"
              value={formData.crop_type}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Crop Type</option>
              {cropTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variety
            </label>
            <select
              name="variety"
              value={formData.variety}
              onChange={handleChange}
              required
              disabled={!formData.crop_type}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select Variety</option>
              {formData.crop_type &&
                varietiesByType[formData.crop_type]?.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classification
            </label>
            <select
              name="classification"
              value={formData.classification}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Classification</option>
              {classifications.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Germination Rate (%)
            </label>
            <input
              type="number"
              name="germination_rate"
              value={formData.germination_rate}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="has_project"
                checked={formData.has_project}
                onChange={handleChange}
                className="mr-2"
              />
              Associated with a project
            </label>
          </div>

          {formData.has_project && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Weight (kg)
            </label>
            <input
              type="number"
              name="initial_quantity"
              value={formData.initial_quantity}
              onChange={handleChange}
              step="0.01"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cleaned Weight (kg)
            </label>
            <input
              type="number"
              name="cleaned_quantity"
              value={formData.cleaned_quantity}
              onChange={handleChange}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              min="1"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight per Packet (kg)
            </label>
            <input
              type="number"
              name="weight_per_packet"
              value={formData.weight_per_packet}
              onChange={handleChange}
              step="0.01"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Others (kg)
            </label>
            <input
              type="number"
              name="others"
              value={formData.others}
              readOnly
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-calculated: (Packets × Weight per Packet) - Cleaned Weight
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Area
            </label>
            <select
              name="storage_area"
              value={formData.storage_area}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Storage Area</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.room_name}
                  {r.building_location ? ` (${r.building_location})` : ""}
                </option>
              ))}
            </select>
          </div>

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
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/seeds")}
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

export default SeedForm;
