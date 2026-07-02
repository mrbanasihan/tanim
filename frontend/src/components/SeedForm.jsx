import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { canAccessFeature } from "../utils/accessControl";
import { CROP_CATALOG, getSelectedCropGroup } from "../constants/cropCatalog";
import { toTitleCase } from "../utils/textFormat";

// SeedForm
// Modal to create or edit seed lots; interacts with seeds and projects APIs, enforces role-based access control
const SeedForm = ({ isOpen, seedId, onClose, onSaveSuccess }) => {
  const { user } = useAuth();
  const isEditing = !!seedId;
  const canManageSeeds = canAccessFeature(user?.role, "create_seed");

  const [formData, setFormData] = useState({
    crop_type: "",
    variety: "",
    classification: "",
    has_project: false,
    project_id: "",
    moisture_content: "",
    gross_weight: "",
    cleaned_quantity: "",
    area_planted: "",
    storage_area: "",
    remarks: "",
  });
  const [areaPlantedOther, setAreaPlantedOther] = useState("");
  const [areaOptions, setAreaOptions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCropGroup = getSelectedCropGroup(user?.role, user?.crop_groups);
  const groupCatalog = selectedCropGroup
    ? CROP_CATALOG[selectedCropGroup] || {}
    : {};
  const cropTypes = Object.keys(groupCatalog);
  const varietiesByType = groupCatalog;
  const classifications = [
    "nucleus",
    "breeder",
    "foundation",
    "registered",
    "certified",
    "good seed",
  ];

  useEffect(() => {
    if (!isOpen) return;

    fetchProjects();
    fetchAreaOptions();
    fetchRooms();
    
    if (isEditing) {
      fetchSeed();
    } else {
      setFormData({
        crop_type: "",
        variety: "",
        classification: "",
        has_project: false,
        project_id: "",
        moisture_content: "",
        gross_weight: "",
        cleaned_quantity: "",
        area_planted: "",
        storage_area: "",
        remarks: "",
      });
      setAreaPlantedOther("");
      setError("");
    }
  }, [isOpen, seedId, user]);

  const fetchProjects = async () => {
    try {
      const selectedGroup = getSelectedCropGroup(user?.role, user?.crop_groups);
      const response = await api.get(
        selectedGroup ? `/projects?crop_group=${selectedGroup}` : "/projects",
      );
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

  const fetchAreaOptions = async () => {
    try {
      const response = await api.get("/seeds");
      const seeds = Array.isArray(response.data) ? response.data : [];
      const validCropTypes = new Set(cropTypes);
      const uniqueAreas = [
        ...new Set(
          seeds
            .filter((seed) => validCropTypes.has(seed.crop_type))
            .map((seed) => (seed.area_planted || "").trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b));
      setAreaOptions(uniqueAreas);
    } catch (error) {
      console.error("Error fetching area planted options:", error);
      setAreaOptions([]);
    }
  };

  const fetchSeed = async () => {
    try {
      const response = await api.get(`/seeds/${seedId}`);
      const data = response.data;
      setFormData({
        crop_type: data.crop_type,
        variety: data.variety,
        classification: data.classification,
        has_project: !!data.project_id,
        project_id: data.project_id || "",
        moisture_content: data.moisture_content || "",
        gross_weight: data.gross_weight,
        cleaned_quantity: data.cleaned_quantity,
        area_planted: data.area_planted || "",
        storage_area: data.storage_area,
        remarks: data.remarks,
      });
      setAreaPlantedOther("");
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

    if (name === "area_planted" && value !== "others") {
      setAreaPlantedOther("");
    }

    if (name === "has_project" && !checked) {
      newFormData.project_id = "";
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!canManageSeeds) {
      setError("You do not have permission to manage seed lots");
      setLoading(false);
      return;
    }

    const submitData = {
      ...formData,
      project_id: formData.has_project ? formData.project_id : null,
      area_planted:
        formData.area_planted === "others"
          ? areaPlantedOther
          : formData.area_planted,
    };

    if (
      formData.area_planted === "others" &&
      !(areaPlantedOther || "").trim()
    ) {
      setError("Please enter an area planted value for Others");
      setLoading(false);
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/seeds/${seedId}`, submitData);
      } else {
        await api.post("/seeds", submitData);
      }

      const finalArea = (submitData.area_planted || "").trim();
      if (finalArea) {
        setAreaOptions((prev) => {
          if (prev.includes(finalArea)) return prev;
          return [...prev, finalArea].sort((a, b) => a.localeCompare(b));
        });
      }

      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("Error saving seed:", error);
      console.error("Full error response:", error.response?.data);
      let errorMsg = "Failed to save seed lot";
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      setError(errorMsg);
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
            {isEditing ? "Edit Seed Lot" : "Add New Seed Lot"}
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
              Crop Type
            </label>
            <select
              name="crop_type"
              value={formData.crop_type}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
            >
              <option value="">Select Crop Type</option>
              {cropTypes.map((type) => (
                <option key={type} value={type}>
                  {toTitleCase(type)}
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] disabled:bg-gray-100"
            >
              <option value="">Select Variety</option>
              {formData.crop_type &&
                varietiesByType[formData.crop_type]?.map((v) => (
                  <option key={v} value={v}>
                    {toTitleCase(v)}
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
            >
              <option value="">Select Classification</option>
              {classifications.map((c) => (
                <option key={c} value={c}>
                  {toTitleCase(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="has_project"
                checked={formData.has_project}
                onChange={handleChange}
                className="mr-2 rounded border-gray-300 text-[#116B2B] focus:ring-[#116B2B]"
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
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {toTitleCase(p.project_name)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moisture Content (%)
            </label>
            <input
              type="number"
              name="moisture_content"
              value={formData.moisture_content}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gross Weight (kg)
            </label>
            <input
              type="number"
              name="gross_weight"
              value={formData.gross_weight}
              onChange={handleChange}
              step="0.01"
              inputMode="decimal"
              required={!isEditing}
              readOnly={isEditing}
              className={`w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] ${isEditing ? "bg-gray-100 text-gray-600" : ""}`}
            />
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Gross weight cannot be changed after seed lot creation.
              </p>
            )}
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
              min="0"
              inputMode="decimal"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Quantity (kg)
            </label>
            <input
              type="number"
              value={formData.cleaned_quantity || formData.gross_weight || ""}
              readOnly
              className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-600 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-set from cleaned quantity, or gross weight if cleaned is empty.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area Planted
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                name="area_planted"
                value={formData.area_planted}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
              >
                <option value="">Select Area Planted</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {toTitleCase(area)}
                  </option>
                ))}
                <option value="others">Others</option>
              </select>

              {formData.area_planted === "others" && (
                <input
                  type="text"
                  name="area_planted_other"
                  value={areaPlantedOther}
                  onChange={(e) => setAreaPlantedOther(e.target.value)}
                  placeholder="Enter area planted"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Area
            </label>
            <select
              name="storage_area"
              value={formData.storage_area}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
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
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B]"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-2">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

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
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeedForm;
