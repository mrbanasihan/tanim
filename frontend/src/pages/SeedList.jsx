import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { filterByCropGroup } from "../utils/accessControl";
import { toTitleCase } from "../utils/textFormat";
import { getSelectedCropGroup, FAMILY_GROUPS, CROP_PROJECTS, CROP_CATALOG } from "../constants/cropCatalog";
import { Eye, Pencil, Trash2 } from "lucide-react";
import SeedForm from "../components/SeedForm";

// SeedList
// Lists all seed lots with filtering by crop type, variety, and project; interacts with seeds API and access control
const SeedList = () => {
  const { user, selectedCropGroup } = useAuth();
  const [seeds, setSeeds] = useState([]);
  const [filteredSeeds, setFilteredSeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    crop_type: "",
    variety: "",
    project_id: "",
    family_group: "",
  });
  const [sortType, setSortType] = useState("name"); // name, quantity
  const [sortOrder, setSortOrder] = useState("asc"); // asc, desc
  const [cropTypes, setCropTypes] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [cropVarietyMap, setCropVarietyMap] = useState({});
  const [projects, setProjects] = useState([]);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [editingSeedId, setEditingSeedId] = useState(null);
  const [showCropTypeDropdown, setShowCropTypeDropdown] = useState(false);
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [cropTypeSearch, setCropTypeSearch] = useState("");
  const [varietySearch, setVarietySearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const cropTypeDropdownRef = useRef(null);
  const varietyDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        cropTypeDropdownRef.current &&
        !cropTypeDropdownRef.current.contains(event.target)
      ) {
        setShowCropTypeDropdown(false);
      }
      if (
        varietyDropdownRef.current &&
        !varietyDropdownRef.current.contains(event.target)
      ) {
        setShowVarietyDropdown(false);
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target)
      ) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchSeeds();
  }, [filters, sortType, sortOrder, user?.role, user?.crop_groups, selectedCropGroup]);

  useEffect(() => {
    if (seeds.length > 0) {
      applySearchAndFilters();
    } else {
      setFilteredSeeds([]);
    }
  }, [searchTerm, seeds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm, sortType, sortOrder]);

  const fileInputRef = useRef(null);

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await api.get(`/seeds/export/excel?${params}`, {
        responseType: "blob",
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seed_inventory_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export Excel error:", error);
      alert("Failed to export seed inventory.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/seeds/import/template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "seed_import_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download template error:", error);
      alert("Failed to download template.");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/seeds/import/excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Seed lots imported successfully!");
      fetchSeeds();
    } catch (error) {
      console.error("Import Excel error:", error);
      const errorDetails = error.response?.data?.details;
      if (Array.isArray(errorDetails)) {
        alert(`Import failed with errors:\n\n${errorDetails.join("\n")}`);
      } else {
        alert(error.response?.data?.error || "Failed to import seed lots.");
      }
    } finally {
      e.target.value = "";
    }
  };

  const fetchSeeds = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "") params.append(key, value);
      });

      const response = await api.get(`/seeds?${params}`);
      let fetchedSeeds = response.data || [];

      // Make sure fetchedSeeds is an array
      if (!Array.isArray(fetchedSeeds)) {
        fetchedSeeds = [];
      }

      // Filter by crop group based on user role and assigned crop groups
      // If no crop_groups are assigned yet, show all available crops for their role
      const cropGroups =
        user?.crop_groups && user.crop_groups.length > 0
          ? user.crop_groups
          : user?.role !== "admin"
            ? []
            : null;
      fetchedSeeds = filterByCropGroup(fetchedSeeds, user?.role, cropGroups);

      // Apply sorting
      fetchedSeeds = applySorting(fetchedSeeds);

      setSeeds(fetchedSeeds);
      setFilteredSeeds(fetchedSeeds);
    } catch (error) {
      console.error("Error fetching seeds:", error);
      setSeeds([]);
      setFilteredSeeds([]);
    } finally {
      setLoading(false);
    }
  };

  const applySorting = (seedsArray) => {
    if (!Array.isArray(seedsArray)) return [];

    const sorted = [...seedsArray];

    if (sortType === "name") {
      if (sortOrder === "asc") {
        return sorted.sort((a, b) =>
          (a.batch_name || "").localeCompare(b.batch_name || ""),
        );
      } else {
        return sorted.sort((a, b) =>
          (b.batch_name || "").localeCompare(a.batch_name || ""),
        );
      }
    } else if (sortType === "quantity") {
      if (sortOrder === "asc") {
        return sorted.sort(
          (a, b) => (a.current_quantity || 0) - (b.current_quantity || 0),
        );
      } else {
        return sorted.sort(
          (a, b) => (b.current_quantity || 0) - (a.current_quantity || 0),
        );
      }
    } else if (sortType === "date") {
      if (sortOrder === "asc") {
        return sorted.sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
      } else {
        return sorted.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
      }
    }

    return sorted;
  };

  const applySearchAndFilters = () => {
    if (!Array.isArray(seeds)) {
      setFilteredSeeds([]);
      return;
    }

    let results = [...seeds];

    // Apply Family Group filter
    if (filters.family_group) {
      results = results.filter(
        (seed) => seed.family_group === filters.family_group
      );
    }

    // Apply search across multiple fields
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      results = results.filter(
        (seed) =>
          (seed.batch_name && seed.batch_name.toLowerCase().includes(term)) ||
          (seed.crop_type && seed.crop_type.toLowerCase().includes(term)) ||
          (seed.variety && seed.variety.toLowerCase().includes(term)) ||
          (seed.location && seed.location.toLowerCase().includes(term)),
      );
    }

    setFilteredSeeds(results);
  };

  const fetchDropdownData = async () => {
    try {
      console.log("🔍 Fetching dropdown data...");

      const selectedGroup = selectedCropGroup;
      const [seedsRes, projectsRes] = await Promise.all([
        api.get("/seeds"),
        api.get(
          selectedGroup ? `/projects?crop_group=${selectedGroup}` : "/projects",
        ),
      ]);

      console.log("📦 Seeds response:", seedsRes.data);
      console.log("📦 Projects response:", projectsRes.data);

      if (selectedGroup && CROP_CATALOG[selectedGroup]) {
        // Load from static CROP_CATALOG so all crops are available to filter on even with 0 stock
        const catalogCrops = Object.keys(CROP_CATALOG[selectedGroup]).sort();
        setCropTypes(catalogCrops);

        const catalogVarieties = Object.values(CROP_CATALOG[selectedGroup]).flat().sort();
        setVarieties(catalogVarieties);

        const catalogMap = {};
        Object.entries(CROP_CATALOG[selectedGroup]).forEach(([crop, vars]) => {
          catalogMap[crop] = vars;
        });
        setCropVarietyMap(catalogMap);
      } else {
        // Fallback: Populate dynamically from database values
        let seedsData = seedsRes.data || [];
        seedsData = filterByCropGroup(seedsData, user?.role, user?.crop_groups);

        const uniqueCropTypes = [
          ...new Set(seedsData.map((seed) => seed.crop_type).filter(Boolean)),
        ].sort();
        setCropTypes(uniqueCropTypes);

        const uniqueVarieties = [
          ...new Set(seedsData.map((seed) => seed.variety).filter(Boolean)),
        ].sort();
        setVarieties(uniqueVarieties);

        const nextCropVarietyMap = {};
        seedsData.forEach((seed) => {
          if (!seed?.crop_type || !seed?.variety) return;
          if (!nextCropVarietyMap[seed.crop_type]) {
            nextCropVarietyMap[seed.crop_type] = new Set();
          }
          nextCropVarietyMap[seed.crop_type].add(seed.variety);
        });

        const normalizedCropVarietyMap = {};
        Object.entries(nextCropVarietyMap).forEach(([crop, varietySet]) => {
          normalizedCropVarietyMap[crop] = Array.from(varietySet).sort();
        });
        setCropVarietyMap(normalizedCropVarietyMap);
      }

      // Get projects - using project_name field
      let projectsData = [];
      if (projectsRes.data) {
        if (Array.isArray(projectsRes.data)) {
          projectsData = projectsRes.data;
        } else if (
          projectsRes.data.projects &&
          Array.isArray(projectsRes.data.projects)
        ) {
          projectsData = projectsRes.data.projects;
        } else if (
          projectsRes.data.data &&
          Array.isArray(projectsRes.data.data)
        ) {
          projectsData = projectsRes.data.data;
        }
      }
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
      setCropTypes([]);
      setVarieties([]);
      setCropVarietyMap({});
      setProjects([]);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSort = (type) => {
    if (sortType === type) {
      // Toggle order if same type
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new type with default asc order
      setSortType(type);
      setSortOrder("asc");
    }
  };

  const handleCropTypeSelect = (cropType) => {
    setFilters((prev) => ({ ...prev, crop_type: cropType, variety: "" }));
    setShowCropTypeDropdown(false);
    setShowVarietyDropdown(false);
    setShowProjectDropdown(false);
    setCropTypeSearch("");
    setVarietySearch("");
  };

  const handleVarietySelect = (variety) => {
    handleFilterChange("variety", variety);
    setShowCropTypeDropdown(false);
    setShowVarietyDropdown(false);
    setShowProjectDropdown(false);
    setVarietySearch("");
  };

  const handleProjectSelect = (project) => {
    handleFilterChange("project_id", project.project_id || "");
    setShowCropTypeDropdown(false);
    setShowVarietyDropdown(false);
    setShowProjectDropdown(false);
    setProjectSearch("");
  };

  const clearAllFilters = () => {
    setFilters({
      crop_type: "",
      variety: "",
      project_id: "",
      family_group: "",
    });
    setSearchTerm("");
    setSortType("name");
    setSortOrder("asc");
    setCropTypeSearch("");
    setVarietySearch("");
    setProjectSearch("");
    setShowCropTypeDropdown(false);
    setShowVarietyDropdown(false);
    setShowProjectDropdown(false);
  };

  const selectedGroup = localStorage.getItem("selectedCropGroup");
  const isVegetables = selectedGroup === "vegetables";

  const filteredCropTypes = cropTypes.filter((crop) => {
    const matchesSearch = crop && crop.toLowerCase().includes((cropTypeSearch || "").toLowerCase());
    if (!filters.family_group) return matchesSearch;
    const familyCrops = FAMILY_GROUPS[filters.family_group] || [];
    return matchesSearch && familyCrops.includes(crop.toLowerCase());
  });

  const baseVarieties = filters.crop_type
    ? cropVarietyMap[filters.crop_type] || []
    : varieties;

  const filteredVarieties = baseVarieties.filter(
    (variety) =>
      variety &&
      variety.toLowerCase().includes((varietySearch || "").toLowerCase()),
  );

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project &&
      project.project_name &&
      project.project_name
        .toLowerCase()
        .includes((projectSearch || "").toLowerCase());
    if (!filters.crop_type) return matchesSearch;
    const cropProjs = CROP_PROJECTS[filters.crop_type.toLowerCase()] || [];
    return matchesSearch && cropProjs.includes(project.project_name);
  });

  const selectedProjectName = filters.project_id
    ? toTitleCase(
        projects.find((p) => p.project_id === filters.project_id)
          ?.project_name || "",
      )
    : "";

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this seed lot?")) {
      try {
        await api.delete(`/seeds/${id}`);
        fetchSeeds(); // Refresh the list
      } catch (error) {
        console.error("Error deleting seed:", error);
        alert("Failed to delete seed lot");
      }
    }
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500 text-lg">Loading seed lots...</div>
      </div>
    );
  }

  const totalItems = filteredSeeds.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSeeds = filteredSeeds.slice(indexOfFirstItem, indexOfLastItem);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#1B5E20" }}>
              Seed Lots
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Browse all seed lot records in the system.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {["admin", "staff", "researcher"].includes(user?.role) && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none"
                    style={{
                      backgroundColor: "#F5F7F5",
                      color: "#555",
                      border: "1px solid #ddd",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#126B2C";
                      e.currentTarget.style.color = "#FFFFFF";
                      e.currentTarget.style.border = "1px solid #126B2C";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#F5F7F5";
                      e.currentTarget.style.color = "#555";
                      e.currentTarget.style.border = "1px solid #ddd";
                    }}
                    title="Export filtered/all transactions to Excel"
                  >
                    Export Excel
                  </button>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none"
                    style={{
                      backgroundColor: "#F5F7F5",
                      color: "#555",
                      border: "1px solid #ddd",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#126B2C";
                      e.currentTarget.style.color = "#FFFFFF";
                      e.currentTarget.style.border = "1px solid #126B2C";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#F5F7F5";
                      e.currentTarget.style.color = "#555";
                      e.currentTarget.style.border = "1px solid #ddd";
                    }}
                    title="Import transactions from Excel"
                  >
                    Import Excel
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none"
                    style={{
                      backgroundColor: "#F5F7F5",
                      color: "#555",
                      border: "1px solid #ddd",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#237F18";
                      e.currentTarget.style.color = "#FFFFFF";
                      e.currentTarget.style.border = "1px solid #237F18";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#F5F7F5";
                      e.currentTarget.style.color = "#555";
                      e.currentTarget.style.border = "1px solid #ddd";
                    }}
                    title="Download transaction import template"
                  >
                    Template
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportExcel}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                </div>
              )}
            {["admin", "researcher", "staff"].includes(user?.role) && (
              <button
                onClick={() => {
                  setEditingSeedId(null);
                  setShowSeedModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-[#D4AF17] hover:bg-[#e8c237] text-white font-medium rounded-lg transition duration-200 shadow-sm hover:shadow-md cursor-pointer"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
                </svg>
                Add New Seed Lot
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Combined Search, Filters, and Sort - All in One Line */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-4">
          <div className="flex flex-wrap lg:flex-nowrap gap-3 items-end">
            {/* Search Bar - Made longer */}
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
                  placeholder="Search seeds..."
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

            {/* Family Group Dropdown */}
            {isVegetables && (
              <div className="dropdown-container w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Group
                </label>
                <select
                  value={filters.family_group || ""}
                  onChange={(e) => {
                    handleFilterChange("family_group", e.target.value);
                    handleFilterChange("crop_type", "");
                    handleFilterChange("variety", "");
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm h-[38px] bg-white cursor-pointer"
                >
                  <option value="">All Families</option>
                  <option value="CUCURBITS">Cucurbits</option>
                  <option value="SOLANACEOUS">Solanaceous</option>
                  <option value="MALLOW">Mallow</option>
                  <option value="LEGUMINOUS">Leguminous</option>
                </select>
              </div>
            )}

            {/* Crop Type Dropdown */}
            <div
              className="relative dropdown-container w-40"
              ref={cropTypeDropdownRef}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Crop Type
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Crop type..."
                  value={
                    filters.crop_type
                      ? toTitleCase(filters.crop_type)
                      : cropTypeSearch
                  }
                  onChange={(e) => {
                    setCropTypeSearch(e.target.value);
                    if (filters.crop_type) {
                      handleFilterChange("crop_type", "");
                    }
                    setShowCropTypeDropdown(true);
                  }}
                  onFocus={() => setShowCropTypeDropdown(true)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCropTypeDropdown(!showCropTypeDropdown)}
                  className="absolute inset-y-0 right-0 flex items-center pr-2"
                >
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              {showCropTypeDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm overflow-auto border border-gray-200">
                  <button
                    onClick={() => handleCropTypeSelect("")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    All Crop Types
                  </button>
                  {filteredCropTypes.map((cropType) => (
                    <button
                      key={cropType}
                      onClick={() => handleCropTypeSelect(cropType)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      {toTitleCase(cropType)}
                    </button>
                  ))}
                  {filteredCropTypes.length === 0 && cropTypeSearch && (
                    <div className="px-3 py-2 text-gray-500 text-xs">
                      No crop types found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Variety Dropdown */}
            <div
              className="relative dropdown-container w-40"
              ref={varietyDropdownRef}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variety
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Variety..."
                  value={
                    filters.variety
                      ? toTitleCase(filters.variety)
                      : varietySearch
                  }
                  onChange={(e) => {
                    setVarietySearch(e.target.value);
                    if (filters.variety) {
                      handleFilterChange("variety", "");
                    }
                    setShowVarietyDropdown(true);
                  }}
                  onFocus={() => setShowVarietyDropdown(true)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowVarietyDropdown(!showVarietyDropdown)}
                  className="absolute inset-y-0 right-0 flex items-center pr-2"
                >
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              {showVarietyDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm overflow-auto border border-gray-200">
                  <button
                    onClick={() => handleVarietySelect("")}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    All Varieties
                  </button>
                  {filteredVarieties.map((variety) => (
                    <button
                      key={variety}
                      onClick={() => handleVarietySelect(variety)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      {toTitleCase(variety)}
                    </button>
                  ))}
                  {filteredVarieties.length === 0 && varietySearch && (
                    <div className="px-3 py-2 text-gray-500 text-xs">
                      No varieties found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Project Dropdown - Fixed with project_name */}
            <div
              className="relative dropdown-container w-40"
              ref={projectDropdownRef}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Project..."
                  value={projectSearch || selectedProjectName}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    if (filters.project_id) {
                      handleFilterChange("project_id", "");
                    }
                    setShowProjectDropdown(true);
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="absolute inset-y-0 right-0 flex items-center pr-2"
                >
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              {showProjectDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm overflow-auto border border-gray-200">
                  <button
                    onClick={() => handleProjectSelect({ project_id: "" })}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    All Projects
                  </button>
                  {filteredProjects.map((project) => (
                    <button
                      key={project.project_id}
                      onClick={() => handleProjectSelect(project)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      {toTitleCase(project.project_name)}
                    </button>
                  ))}
                  {filteredProjects.length === 0 && projectSearch && (
                    <div className="px-3 py-2 text-gray-500 text-xs">
                      No projects found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sort By - Combined Toggle Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSort("name")}
                  className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                    sortType === "name"
                      ? "bg-[#86B839] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={
                    sortType === "name" && sortOrder === "asc"
                      ? "Sort Z-A"
                      : "Sort A-Z"
                  }
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
                  onClick={() => toggleSort("quantity")}
                  className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                    sortType === "quantity"
                      ? "bg-[#86B839] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={
                    sortType === "quantity" && sortOrder === "asc"
                      ? "Highest first"
                      : "Lowest first"
                  }
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {sortType === "quantity" && sortOrder === "desc" ? (
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
                  <span className="text-sm">Qty</span>
                </button>
                <button
                  onClick={() => toggleSort("date")}
                  className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                    sortType === "date"
                      ? "bg-[#86B839] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={
                    sortType === "date" && sortOrder === "asc"
                      ? "Oldest first"
                      : "Newest first"
                  }
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

            {/* Clear All Button - Now fits in one line */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">
                Clear
              </label>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition text-sm whitespace-nowrap"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Active Filters Tags - On a Separate Line */}
          {(filters.crop_type ||
            filters.variety ||
            filters.project_id ||
            searchTerm) && (
            <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 mr-1 font-medium">
                Active filters:
              </span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Search: {searchTerm}
                  <button
                    onClick={() => setSearchTerm("")}
                    className="ml-1.5 hover:text-[#86B839]font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.crop_type && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Crop: {toTitleCase(filters.crop_type)}
                  <button
                    onClick={() => handleFilterChange("crop_type", "")}
                    className="ml-1.5 hover:text-green-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.variety && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  Variety: {toTitleCase(filters.variety)}
                  <button
                    onClick={() => handleFilterChange("variety", "")}
                    className="ml-1.5 hover:text-purple-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.project_id && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  Project:{" "}
                  {toTitleCase(
                    projects.find((p) => p.project_id === filters.project_id)
                      ?.project_name || "",
                  )}
                  <button
                    onClick={() => handleFilterChange("project_id", "")}
                    className="ml-1.5 hover:text-yellow-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Count & Export Button */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
        <div>
          Showing {totalItems > 0 ? indexOfFirstItem + 1 : 0} to{" "}
          {Math.min(indexOfLastItem, totalItems)} of {totalItems} seed lots{" "}
          {totalItems < seeds.length && `(filtered from ${seeds.length} total)`}
        </div>
      </div>

      {/* Seeds Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot Number
                </th>
                {isVegetables && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family Group
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crop Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variety
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight (kg)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSeeds.length > 0 ? (
                currentSeeds.map((seed) => (
                  <tr
                    key={seed.seed_id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {seed.batch_name ? toTitleCase(seed.batch_name) : "N/A"}
                    </td>
                    {isVegetables && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                          {seed.family_group || "N/A"}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {seed.crop_type ? toTitleCase(seed.crop_type) : "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {seed.variety ? toTitleCase(seed.variety) : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-semibold">
                        {seed.current_quantity || 0}
                      </span>{" "}
                      kg
                    </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/seeds/${seed.seed_id}`}
                          className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <Eye size={18} />
                        </Link>

                        {["admin", "researcher", "staff"].includes(user?.role) && (
                          <button
                            onClick={() => {
                              setEditingSeedId(seed.seed_id);
                              setShowSeedModal(true);
                            }}
                            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                        )}

                        {["admin", "researcher"].includes(user?.role) && (
                          <button
                            onClick={() => handleDelete(seed.seed_id)}
                            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="mt-2">No seed lots found</p>
                    <p className="text-sm">
                      Try adjusting your filters or search term
                    </p>
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
                           ? "z-10 bg-[#237F18] border-[#237F18] text-white"
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

      {/* Seed Add/Edit Modal Form */}
      <SeedForm
        isOpen={showSeedModal}
        seedId={editingSeedId}
        onClose={() => setShowSeedModal(false)}
        onSaveSuccess={() => {
          setShowSeedModal(false);
          fetchSeeds();
        }}
      />
    </div>
  );
};

export default SeedList;
