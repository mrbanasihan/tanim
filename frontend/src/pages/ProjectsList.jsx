import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toTitleCase } from "../utils/textFormat";
import { Pencil, Trash2, Plus, Calendar } from "lucide-react";
import ProjectsForm from "../components/ProjectsForm";

const ProjectsList = () => {
  const { user, selectedCropGroup } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "inactive"

  // Sorting states
  const [sortType, setSortType] = useState("name"); // "name", "date"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc", "desc"

  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const canManageProjects = ["admin", "researcher", "staff"].includes(user?.role);
  const canDeleteProjects = ["admin", "researcher"].includes(user?.role);

  useEffect(() => {
    fetchProjects();
  }, [selectedCropGroup]);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [searchTerm, projects, statusFilter, sortType, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCropGroup, statusFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");
      
      const endpoint = selectedCropGroup 
        ? `/projects?crop_group=${selectedCropGroup}` 
        : "/projects";
        
      const response = await api.get(endpoint);
      const data = response.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects list");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatus = (project) => {
    if (!project.end_date) return "active";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(project.end_date);
    end.setHours(0, 0, 0, 0);
    return end >= today ? "active" : "inactive";
  };

  const applySorting = (projectsArray) => {
    const sorted = [...projectsArray];
    return sorted.sort((a, b) => {
      let comparison = 0;
      if (sortType === "name") {
        const nameA = (a.project_name || "").toLowerCase();
        const nameB = (b.project_name || "").toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortType === "date") {
        const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
        const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
        comparison = dateA - dateB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const applyFiltersAndSorting = () => {
    if (!Array.isArray(projects)) {
      setFilteredProjects([]);
      return;
    }

    let results = [...projects];

    // Filter by crop group on frontend to ensure projects not belonging to the selected crop group are never shown
    if (selectedCropGroup) {
      results = results.filter((project) => 
        Array.isArray(project.crop_groups) && project.crop_groups.includes(selectedCropGroup)
      );
    }

    // 1. Status Filter
    if (statusFilter !== "all") {
      results = results.filter((project) => getProjectStatus(project) === statusFilter);
    }

    // 2. Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      results = results.filter((project) => {
        const name = (project.project_name || "").toLowerCase();
        const code = (project.project_code || "").toLowerCase();
        const desc = (project.description || "").toLowerCase();
        return name.includes(term) || code.includes(term) || desc.includes(term);
      });
    }

    // 3. Sorting
    results = applySorting(results);

    setFilteredProjects(results);
  };

  const toggleSort = (type) => {
    if (sortType === type) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortType(type);
      setSortOrder(type === "name" ? "asc" : "desc");
    }
  };

  const handleHeaderClick = (type) => {
    toggleSort(type);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the project "${name}"?`)) {
      try {
        await api.delete(`/projects/${id}`);
        fetchProjects();
      } catch (err) {
        console.error("Error deleting project:", err);
        alert(err.response?.data?.error || "Failed to delete project");
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCropGroupBadgeStyle = (group) => {
    switch (group?.toLowerCase()) {
      case "legumes":
        return "bg-green-50 text-green-700 border-green-100";
      case "cereals":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "vegetables":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const getStatusBadgeStyle = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  // Pagination helper calculations
  const totalItems = filteredProjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage <= 3) {
        pages.push(2);
        pages.push(3);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push("...");
        pages.push(totalPages - 2);
        pages.push(totalPages - 1);
        pages.push(totalPages);
      } else {
        pages.push("...");
        pages.push(currentPage);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500 text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#1B5E20" }}>
              Projects
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Browse and manage research projects and their associated crop groups.
            </p>
          </div>
          {canManageProjects && (
            <button
              onClick={() => {
                setEditingProjectId(null);
                setShowProjectsModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-[#D4AF17] hover:bg-[#e8c237] text-white font-medium rounded-lg transition duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Project
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search Panel (similar to Transaction History page) */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-4">
          <div className="flex flex-wrap lg:flex-nowrap gap-3 items-end">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative dropdown-container w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Sort By buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className={`px-3 py-2 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    sortType === "name"
                      ? "bg-[#86B839] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={sortType === "name" && sortOrder === "asc" ? "Sort Z-A" : "Sort A-Z"}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {sortType === "name" && sortOrder === "asc" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                      />
                    ) : sortType === "name" && sortOrder === "desc" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4h13M3 8h9m-9 4h9m5-4l4 4m0 0l4-4m-4 4V4"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                      />
                    )}
                  </svg>
                  <span className="text-sm">Name</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  className={`px-3 py-2 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    sortType === "date"
                      ? "bg-[#86B839] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={sortType === "date" && sortOrder === "asc" ? "Oldest first" : "Newest first"}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {sortType === "date" && sortOrder === "desc" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    )}
                  </svg>
                  <span className="text-sm">Date</span>
                </button>
              </div>
            </div>

            {/* Clear All button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">
                Clear
              </label>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setSortType("name");
                  setSortOrder("asc");
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition text-sm whitespace-nowrap h-[38px] cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Active filter badges */}
          {(searchTerm || statusFilter !== "all") && (
            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 mr-1 font-medium">
                Active filters:
              </span>
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Search: {searchTerm}
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1.5 hover:text-blue-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  Status: {toTitleCase(statusFilter)}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="ml-1.5 hover:text-purple-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Count Summary */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-600 px-1">
        <div>
          Showing {totalItems > 0 ? indexOfFirstItem + 1 : 0} to{" "}
          {Math.min(indexOfLastItem, totalItems)} of {totalItems} projects{" "}
          {totalItems < projects.length && `(filtered from ${projects.length} total)`}
        </div>
      </div>

      {/* Projects Table/List */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/75">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Project Code
                </th>
                <th 
                  onClick={() => handleHeaderClick("name")}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-[#116B2B] group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Project Name</span>
                    {sortType === "name" ? (
                      <span className="text-[#116B2B]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">▲</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Crop Groups
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  onClick={() => handleHeaderClick("date")}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-[#116B2B] group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Duration</span>
                    {sortType === "date" ? (
                      <span className="text-[#116B2B]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                    ) : (
                      <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">▲</span>
                    )}
                  </div>
                </th>
                {canManageProjects && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentProjects.length > 0 ? (
                currentProjects.map((project) => (
                  <tr key={project.project_id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                      {project.project_code ? (
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-mono">
                          {project.project_code}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No code</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {toTitleCase(project.project_name)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={project.description}>
                      {project.description || <span className="text-gray-400 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(project.crop_groups) && project.crop_groups.length > 0 ? (
                          project.crop_groups.map((group) => (
                            <span
                              key={group}
                              className={`px-2 py-0.5 border rounded-full text-xs font-medium ${getCropGroupBadgeStyle(group)}`}
                            >
                              {toTitleCase(group)}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic text-xs">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(getProjectStatus(project))}`}>
                        {toTitleCase(getProjectStatus(project))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {project.start_date || project.end_date ? (
                            `${formatDate(project.start_date) || "Start"} - ${formatDate(project.end_date) || "Present"}`
                          ) : (
                            <span className="text-gray-400 italic">Ongoing</span>
                          )}
                        </span>
                      </div>
                    </td>
                    {canManageProjects && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingProjectId(project.project_id);
                              setShowProjectsModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-[#116B2B] transition-colors cursor-pointer"
                            title="Edit Project"
                          >
                            <Pencil size={18} />
                          </button>
                          {canDeleteProjects && (
                            <button
                              onClick={() => handleDelete(project.project_id, project.project_name)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={canManageProjects ? 7 : 6}
                    className="px-6 py-10 text-center text-gray-500 text-sm italic"
                  >
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-between items-center bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {getPageNumbers().map((page, idx) => (
                  page === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      aria-current={currentPage === page ? "page" : undefined}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition ${
                        currentPage === page
                          ? "z-10 bg-[#116B2B] border-[#116B2B] text-white"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal Integration */}
      <ProjectsForm
        isOpen={showProjectsModal}
        projectId={editingProjectId}
        onClose={() => setShowProjectsModal(false)}
        onSaveSuccess={() => {
          setShowProjectsModal(false);
          fetchProjects();
        }}
      />
    </div>
  );
};

export default ProjectsList;
