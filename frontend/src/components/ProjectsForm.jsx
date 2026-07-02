import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { CROP_GROUPS } from "../constants/cropCatalog";
import { toTitleCase } from "../utils/textFormat";

// ProjectsForm
// Modal to create or edit projects; interacts with project APIs and enforces role-based access control
const ProjectsForm = ({ isOpen, projectId, onClose, onSaveSuccess }) => {
  const { user, selectedCropGroup } = useAuth();
  const isEditing = !!projectId;
  const canManageProjects = ["admin", "researcher", "staff"].includes(user?.role);

  const [formData, setFormData] = useState({
    project_name: "",
    project_code: "",
    description: "",
    start_date: "",
    end_date: "",
    crop_groups: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    if (isEditing) {
      fetchProjectDetails();
    } else {
      setFormData({
        project_name: "",
        project_code: "",
        description: "",
        start_date: "",
        end_date: "",
        crop_groups: selectedCropGroup ? [selectedCropGroup] : ["legumes"],
      });
    }
  }, [isOpen, projectId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      const data = response.data;
      setFormData({
        project_name: data.project_name || "",
        project_code: data.project_code || "",
        description: data.description || "",
        start_date: data.start_date ? data.start_date.substring(0, 10) : "",
        end_date: data.end_date ? data.end_date.substring(0, 10) : "",
        crop_groups: Array.isArray(data.crop_groups) ? data.crop_groups : [],
      });
    } catch (error) {
      console.error("Error fetching project details:", error);
      setError("Failed to load project details");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCropGroupChange = (group) => {
    setFormData((prev) => {
      const currentGroups = Array.isArray(prev.crop_groups) ? prev.crop_groups : [];
      const newGroups = currentGroups.includes(group)
        ? currentGroups.filter((g) => g !== group)
        : [...currentGroups, group];
      return {
        ...prev,
        crop_groups: newGroups,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!canManageProjects) {
      setError("You do not have permission to manage projects");
      setLoading(false);
      return;
    }

    if (!formData.project_name.trim()) {
      setError("Project name is required");
      setLoading(false);
      return;
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      setError("Start date cannot be after end date");
      setLoading(false);
      return;
    }

    const submitData = {
      projectName: formData.project_name.trim(),
      projectCode: formData.project_code.trim() || null,
      description: formData.description.trim() || null,
      startDate: formData.start_date || null,
      endDate: formData.end_date || null,
      cropGroups: formData.crop_groups,
    };

    try {
      if (isEditing) {
        await api.put(`/projects/${projectId}`, submitData);
      } else {
        await api.post("/projects", submitData);
      }

      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("Error saving project:", error);
      let errorMsg = "Failed to save project";
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? "Edit Project" : "Add New Project"}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="project_name"
              value={formData.project_name}
              onChange={handleChange}
              required
              placeholder="e.g. Core BS Self-pollinated"
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Code
            </label>
            <input
              type="text"
              name="project_code"
              value={formData.project_code}
              onChange={handleChange}
              placeholder="e.g. PJ-001"
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Crop Groups
            </label>
            <div className="flex flex-wrap gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              {CROP_GROUPS.map((group) => (
                <label key={group} className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.crop_groups.includes(group)}
                    onChange={() => handleCropGroupChange(group)}
                    className="mr-2 rounded border-gray-300 text-[#116B2B] focus:ring-[#116B2B] h-4 w-4"
                  />
                  {toTitleCase(group)}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select one or more crop groups associated with this project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] focus:border-transparent transition-all text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] focus:border-transparent transition-all text-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Provide a brief description of the project..."
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#116B2B] focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
              <div className="flex">
                <div className="shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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

export default ProjectsForm;
