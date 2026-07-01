import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { filterByCropGroup } from "../utils/accessControl";
import { toTitleCase } from "../utils/textFormat";
import { Pencil, Trash2 } from "lucide-react";

// TransactionHistory
// Displays transaction history with filtering and sorting by type, seed lot, crop type, and variety
const TransactionHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    seed_lot_id: "",
    crop_type: "",
    variety: "",
  });
  const [sortType, setSortType] = useState("name"); // name, date, quantity
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [checkoutPage, setCheckoutPage] = useState(1);
  const [disposalPage, setDisposalPage] = useState(1);
  const itemsPerPage = 10;
  const [cropTypes, setCropTypes] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [cropVarietyMap, setCropVarietyMap] = useState({});
  const navigate = useNavigate();
  const canManageTransactionActions = ["admin", "researcher"].includes(
    user?.role,
  );

  // handleDeleteTransaction
  // Deletes a transaction after user confirmation and refreshes transaction list
  const handleDeleteTransaction = async (transactionId) => {
    if (!canManageTransactionActions) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction? This will restore the deducted quantity.",
    );
    if (!confirmed) return;

    try {
      await api.delete(`/transactions/${transactionId}`);
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to delete transaction",
      );
    }
  };

  // normalizeTransaction
  // Normalizes transaction data structure from API response
  const normalizeTransaction = (transaction) => ({
    ...transaction,
    type: transaction.type || transaction.transaction_type,
    id: transaction.id || transaction.transaction_id,
    seed_id: transaction.seed_id || transaction.seed_lot_id,
  });

  // fetchDropdownData
  // Fetches crop types and varieties for filter dropdowns
  const fetchDropdownData = async () => {
    try {
      const response = await api.get("/seeds");
      const seedsData = filterByCropGroup(
        response.data || [],
        user?.role,
        user?.crop_groups,
      );

      // Get unique crop types
      const uniqueCropTypes = [
        ...new Set(seedsData.map((seed) => seed.crop_type).filter(Boolean)),
      ].sort();
      setCropTypes(uniqueCropTypes);

      // Get unique varieties
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
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
      setCropVarietyMap({});
    }
  };

  const applySorting = (transactionsArray) => {
    if (!Array.isArray(transactionsArray)) return [];

    const sorted = [...transactionsArray];

    if (sortType === "name") {
      if (sortOrder === "asc") {
        return sorted.sort((a, b) =>
          (a.batch_name || a.seed_id || "").localeCompare(
            b.batch_name || b.seed_id || "",
          ),
        );
      }
      return sorted.sort((a, b) =>
        (b.batch_name || b.seed_id || "").localeCompare(
          a.batch_name || a.seed_id || "",
        ),
      );
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
    } else if (sortType === "quantity") {
      if (sortOrder === "asc") {
        return sorted.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      } else {
        return sorted.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      }
    }

    return sorted;
  };

  const toggleSort = (type) => {
    if (sortType === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortType(type);
      setSortOrder("desc");
    }
  };

  const fileInputRef = useRef(null);

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/transactions/export/excel?${params}`, {
        responseType: "blob",
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `transactions_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export Excel error:", error);
      alert("Failed to export transaction history.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/transactions/import/template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transaction_import_template.xlsx");
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
      await api.post("/transactions/import/excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Transactions imported successfully!");
      fetchTransactions();
    } catch (error) {
      console.error("Import Excel error:", error);
      const errorDetails = error.response?.data?.details;
      if (Array.isArray(errorDetails)) {
        alert(`Import failed with errors:\n\n${errorDetails.join("\n")}`);
      } else {
        alert(error.response?.data?.error || "Failed to import transactions.");
      }
    } finally {
      e.target.value = "";
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === "seed_lot_id") {
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
            if (isValidUUID) params.append(key, value);
          } else {
            params.append(key, value);
          }
        }
      });
      const response = await api.get(`/transactions?${params}`);
      let transactionsData = filterByCropGroup(
        response.data.map(normalizeTransaction),
        user?.role,
        user?.crop_groups,
      );
      if (user?.role === "guest") {
        transactionsData = transactionsData.filter(
          (transaction) => transaction.type === "outgoing",
        );
      }
      transactionsData = applySorting(transactionsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filters, sortType, sortOrder]);

  useEffect(() => {
    setCheckoutPage(1);
    setDisposalPage(1);
  }, [filters, sortType, sortOrder]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      if (name === "crop_type") {
        return { ...prev, crop_type: value, variety: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const visibleVarieties = filters.crop_type
    ? cropVarietyMap[filters.crop_type] || []
    : varieties;

  const clearAllFilters = () => {
    setFilters({
      type: "",
      seed_lot_id: "",
      crop_type: "",
      variety: "",
    });
    setSortType("name");
    setSortOrder("desc");
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Apply client-side filtering if search is not a UUID
  const getFilteredTransactions = () => {
    const term = (filters.seed_lot_id || "").trim().toLowerCase();
    if (!term) return transactions;

    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
    if (isValidUUID) return transactions; // Backend already filtered it

    return transactions.filter((t) => {
      return (
        (t.batch_name && t.batch_name.toLowerCase().includes(term)) ||
        (t.recipient && t.recipient.toLowerCase().includes(term)) ||
        (t.purpose && t.purpose.toLowerCase().includes(term)) ||
        (t.affiliation && t.affiliation.toLowerCase().includes(term)) ||
        (t.remarks && t.remarks.toLowerCase().includes(term)) ||
        (t.crop_type && t.crop_type.toLowerCase().includes(term)) ||
        (t.variety && t.variety.toLowerCase().includes(term))
      );
    });
  };

  const filteredTransactions = getFilteredTransactions();

  const checkoutTransactions = filteredTransactions.filter((t) => t.type === "outgoing");
  const disposalTransactions = filteredTransactions.filter((t) => t.type === "disposal");

  // Checkout pagination helpers
  const totalCheckout = checkoutTransactions.length;
  const totalCheckoutPages = Math.ceil(totalCheckout / itemsPerPage);
  const checkoutStartIndex = (checkoutPage - 1) * itemsPerPage;
  const currentCheckoutTransactions = checkoutTransactions.slice(
    checkoutStartIndex,
    checkoutStartIndex + itemsPerPage
  );

  // Disposal pagination helpers
  const totalDisposal = disposalTransactions.length;
  const totalDisposalPages = Math.ceil(totalDisposal / itemsPerPage);
  const disposalStartIndex = (disposalPage - 1) * itemsPerPage;
  const currentDisposalTransactions = disposalTransactions.slice(
    disposalStartIndex,
    disposalStartIndex + itemsPerPage
  );

  const getCheckoutPageNumbers = () => {
    const pages = [];
    if (totalCheckoutPages <= 5) {
      for (let i = 1; i <= totalCheckoutPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (checkoutPage <= 3) {
        pages.push(2);
        pages.push(3);
        pages.push("...");
        pages.push(totalCheckoutPages);
      } else if (checkoutPage >= totalCheckoutPages - 2) {
        pages.push("...");
        pages.push(totalCheckoutPages - 2);
        pages.push(totalCheckoutPages - 1);
        pages.push(totalCheckoutPages);
      } else {
        pages.push("...");
        pages.push(checkoutPage);
        pages.push("...");
        pages.push(totalCheckoutPages);
      }
    }
    return pages;
  };

  const getDisposalPageNumbers = () => {
    const pages = [];
    if (totalDisposalPages <= 5) {
      for (let i = 1; i <= totalDisposalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (disposalPage <= 3) {
        pages.push(2);
        pages.push(3);
        pages.push("...");
        pages.push(totalDisposalPages);
      } else if (disposalPage >= totalDisposalPages - 2) {
        pages.push("...");
        pages.push(totalDisposalPages - 2);
        pages.push(totalDisposalPages - 1);
        pages.push(totalDisposalPages);
      } else {
        pages.push("...");
        pages.push(disposalPage);
        pages.push("...");
        pages.push(totalDisposalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">
                Transaction History
              </h1>
              <p className="text-sm text-slate-500">
                Browse all seed lot transactions with filters for type and seed
                lot.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {["admin", "staff"].includes(user?.role) && (
                <>
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
                </>
              )}
              <button
                onClick={() => navigate("/transactions/new")}
                className="inline-flex items-center px-4 py-2 bg-[#D4AF17] hover:bg-[#e8c237] text-white font-medium rounded-lg transition duration-200 shadow-sm hover:shadow-md"
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
                Add New Transaction
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-4">
            <div className="flex flex-wrap lg:flex-nowrap gap-3 items-end">
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
                    name="seed_lot_id"
                    placeholder="Search transactions..."
                    value={filters.seed_lot_id}
                    onChange={handleFilterChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  />
                  {filters.seed_lot_id && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, seed_lot_id: "" }))
                      }
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

              <div className="relative dropdown-container w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crop Type
                </label>
                <div className="relative">
                  <select
                    name="crop_type"
                    value={filters.crop_type}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">All Crops</option>
                    {cropTypes.map((crop) => (
                      <option key={crop} value={crop}>
                        {toTitleCase(crop)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative dropdown-container w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variety
                </label>
                <div className="relative">
                  <select
                    name="variety"
                    value={filters.variety}
                    onChange={handleFilterChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">All Varieties</option>
                    {visibleVarieties.map((variety) => (
                      <option key={variety} value={variety}>
                        {toTitleCase(variety)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSort("name")}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                      sortType === "name"
                        ? "bg-blue-600 text-white"
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
                    onClick={() => toggleSort("date")}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                      sortType === "date"
                        ? "bg-blue-600 text-white"
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
                  <button
                    onClick={() => toggleSort("quantity")}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
                      sortType === "quantity"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    title={
                      sortType === "quantity" && sortOrder === "asc"
                        ? "Lowest first"
                        : "Highest first"
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
                </div>
              </div>

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

            {(filters.type ||
              filters.seed_lot_id ||
              filters.crop_type ||
              filters.variety) && (
              <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 mr-1 font-medium">
                  Active filters:
                </span>
                {filters.type && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Type: {filters.type}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, type: "" }))
                      }
                      className="ml-1.5 hover:text-blue-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.seed_lot_id && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Search: {filters.seed_lot_id}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, seed_lot_id: "" }))
                      }
                      className="ml-1.5 hover:text-green-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.crop_type && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Crop: {toTitleCase(filters.crop_type)}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          crop_type: "",
                          variety: "",
                        }))
                      }
                      className="ml-1.5 hover:text-purple-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.variety && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    Variety: {toTitleCase(filters.variety)}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, variety: "" }))
                      }
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

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          {transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No transactions found
            </div>
          ) : (
            <div className="space-y-8">
              {(filters.type === "" || filters.type === "outgoing") &&
                totalCheckout > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Check-out Transactions
                      </h3>
                      <span className="text-sm text-slate-500">
                        Showing {totalCheckout > 0 ? checkoutStartIndex + 1 : 0} to{" "}
                        {Math.min(checkoutStartIndex + itemsPerPage, totalCheckout)} of{" "}
                        {totalCheckout} records
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-3xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 table-auto">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Batch Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Recipient
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Purpose
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Affiliation
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Contact
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Remarks
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Date
                            </th>
                            {canManageTransactionActions && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {currentCheckoutTransactions.map((transaction) => (
                              <tr
                                key={transaction.id}
                                className="hover:bg-slate-50"
                              >
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.batch_name
                                    ? toTitleCase(transaction.batch_name)
                                    : transaction.seed_id}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.quantity}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.recipient
                                    ? toTitleCase(transaction.recipient)
                                    : "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.purpose
                                    ? toTitleCase(transaction.purpose)
                                    : "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.affiliation
                                    ? toTitleCase(transaction.affiliation)
                                    : "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.contact || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.remarks || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {new Date(
                                    transaction.created_at,
                                  ).toLocaleDateString()}
                                </td>
                                {canManageTransactionActions && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        navigate(`/transactions/${transaction.id}/edit`)
                                      }
                                      className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil size={18} />
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleDeleteTransaction(transaction.id)
                                      }
                                      className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {totalCheckoutPages > 1 && (
                      <div className="mt-4 flex justify-between items-center bg-white px-4 py-3 rounded-lg border border-slate-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() => setCheckoutPage((prev) => Math.max(prev - 1, 1))}
                            disabled={checkoutPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCheckoutPage((prev) => Math.min(prev + 1, totalCheckoutPages))}
                            disabled={checkoutPage === totalCheckoutPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Page <span className="font-medium">{checkoutPage}</span> of{" "}
                              <span className="font-medium">{totalCheckoutPages}</span>
                            </p>
                          </div>
                          <div>
                            <nav
                              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                              aria-label="Pagination"
                            >
                              <button
                                onClick={() => setCheckoutPage((prev) => Math.max(prev - 1, 1))}
                                disabled={checkoutPage === 1}
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
                              {getCheckoutPageNumbers().map((page, idx) => (
                                page === "..." ? (
                                  <span
                                    key={`ellipsis-checkout-${idx}`}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500"
                                  >
                                    ...
                                  </span>
                                ) : (
                                  <button
                                    key={page}
                                    onClick={() => setCheckoutPage(page)}
                                    aria-current={checkoutPage === page ? "page" : undefined}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition ${
                                      checkoutPage === page
                                        ? "z-10 bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                )
                              ))}
                              <button
                                onClick={() => setCheckoutPage((prev) => Math.min(prev + 1, totalCheckoutPages))}
                                disabled={checkoutPage === totalCheckoutPages}
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
                  </div>
                )}

              {user?.role !== "guest" &&
                (filters.type === "" || filters.type === "disposal") &&
                totalDisposal > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Disposal Transactions
                      </h3>
                      <span className="text-sm text-slate-500">
                        Showing {totalDisposal > 0 ? disposalStartIndex + 1 : 0} to{" "}
                        {Math.min(disposalStartIndex + itemsPerPage, totalDisposal)} of{" "}
                        {totalDisposal} records
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-3xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 table-auto">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Batch Name
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Purpose
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Remarks
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                              Date
                            </th>
                            {canManageTransactionActions && (
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {currentDisposalTransactions.map((transaction) => (
                              <tr
                                key={transaction.id}
                                className="hover:bg-slate-50"
                              >
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.batch_name
                                    ? toTitleCase(transaction.batch_name)
                                    : transaction.seed_id}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.quantity}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.purpose
                                    ? toTitleCase(transaction.purpose)
                                    : "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {transaction.remarks || "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  {new Date(
                                    transaction.created_at,
                                  ).toLocaleDateString()}
                                </td>
                                {canManageTransactionActions && (
                                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap space-x-3">
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/transactions/${transaction.id}/edit`,
                                        )
                                      }
                                      className="text-indigo-600 hover:text-indigo-900"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteTransaction(transaction.id)
                                      }
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {totalDisposalPages > 1 && (
                      <div className="mt-4 flex justify-between items-center bg-white px-4 py-3 rounded-lg border border-slate-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() => setDisposalPage((prev) => Math.max(prev - 1, 1))}
                            disabled={disposalPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setDisposalPage((prev) => Math.min(prev + 1, totalDisposalPages))}
                            disabled={disposalPage === totalDisposalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Page <span className="font-medium">{disposalPage}</span> of{" "}
                              <span className="font-medium">{totalDisposalPages}</span>
                            </p>
                          </div>
                          <div>
                            <nav
                              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                              aria-label="Pagination"
                            >
                              <button
                                onClick={() => setDisposalPage((prev) => Math.max(prev - 1, 1))}
                                disabled={disposalPage === 1}
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
                              {getDisposalPageNumbers().map((page, idx) => (
                                page === "..." ? (
                                  <span
                                    key={`ellipsis-disposal-${idx}`}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500"
                                  >
                                    ...
                                  </span>
                                ) : (
                                  <button
                                    key={page}
                                    onClick={() => setDisposalPage(page)}
                                    aria-current={disposalPage === page ? "page" : undefined}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition ${
                                      disposalPage === page
                                        ? "z-10 bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                )
                              ))}
                              <button
                                onClick={() => setDisposalPage((prev) => Math.min(prev + 1, totalDisposalPages))}
                                disabled={disposalPage === totalDisposalPages}
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
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
