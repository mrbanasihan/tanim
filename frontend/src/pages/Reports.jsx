import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement,
} from "chart.js";
import { Pie, Bar, Doughnut, Line } from "react-chartjs-2";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { canAccessFeature, filterByCropGroup } from "../utils/accessControl";
import { getSelectedCropGroup } from "../constants/cropCatalog";
import { toTitleCase } from "../utils/textFormat";
import { PieChart, Database, BarChart2, Activity, TrendingUp, Folder } from "lucide-react";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement
);

const REPORTS_NAV = [
  { id: "crop-dist", label: "Crop Distribution", icon: <PieChart className="w-5 h-5" /> },
  { id: "storage", label: "Storage Area Utilization", icon: <Database className="w-5 h-5" /> },
  { id: "variety", label: "Variety Distribution per Crop", icon: <BarChart2 className="w-5 h-5" /> },
  { id: "project-dist", label: "Project Stock Distribution", icon: <Folder className="w-5 h-5" /> },
  { id: "trans-vol", label: "Transaction Volume by Type", icon: <Activity className="w-5 h-5" /> },
  { id: "trans-trends", label: "Transaction Trends Over Time", icon: <TrendingUp className="w-5 h-5" /> },
];

const COLORS = [
  "#126B2C",
  "#237F18",
  "#D4AF17",
  "#105221", 
  "#2B9E1E", 
  "#EBC844", 
  "#0B421B"  
];

// Reports
// Generates and displays charts for seeds, transactions, and projects in a dashboard layout
const Reports = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const canViewReports = canAccessFeature(user?.role, "view_reports");
  
  const [reportData, setReportData] = useState({
    seeds: [],
    transactions: [],
    projects: [],
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dashboard UI state
  const [activeReport, setActiveReport] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!canViewReports) {
      navigate("/dashboard", { replace: true });
      return;
    }
    fetchReportData();
  }, [authLoading, canViewReports, navigate, user]);

  const fetchReportData = async () => {
    try {
      setError(null);
      setLoading(true);
      const selectedGroup = getSelectedCropGroup(user?.role, user?.crop_groups);
      const [seedsRes, transactionsRes, projectsRes, roomsRes] =
        await Promise.all([
          api.get("/seeds"),
          api.get("/transactions"),
          api.get(
            selectedGroup
              ? `/projects?crop_group=${selectedGroup}`
              : "/projects",
          ),
          api.get("/rooms"),
        ]);

      const filteredSeeds = filterByCropGroup(
        seedsRes.data || [],
        user?.role,
        user?.crop_groups,
      );
      const filteredTransactions = filterByCropGroup(
        transactionsRes.data || [],
        user?.role,
        user?.crop_groups,
      );

      setReportData({
        seeds: filteredSeeds,
        transactions: filteredTransactions,
        projects: projectsRes.data || [],
      });
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError(error.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  // Data Extraction Functions

  const getFilteredSeeds = () => {
    if (!selectedProjectId) return reportData.seeds;
    return reportData.seeds.filter((s) => s.project_id === selectedProjectId);
  };

  const getFilteredTransactions = () => {
    if (!selectedProjectId) return reportData.transactions;
    const projectSeedIds = new Set(
      reportData.seeds
        .filter((s) => s.project_id === selectedProjectId)
        .map((s) => s.seed_id)
    );
    return reportData.transactions.filter((t) => projectSeedIds.has(t.seed_id));
  };

  const getCropDistributionData = () => {
    const cropData = {};
    getFilteredSeeds().forEach((seed) => {
      const quantity = Number(seed.current_quantity) || 0;
      cropData[seed.crop_type] = (cropData[seed.crop_type] || 0) + quantity;
    });
    return {
      labels: Object.keys(cropData),
      datasets: [
        {
          data: Object.values(cropData),
          backgroundColor: COLORS,
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    };
  };

  const getStorageUtilizationData = () => {
    const storageData = {};
    getFilteredSeeds().forEach((seed) => {
      const area =
        rooms.find((room) => room.room_id === seed.storage_area)?.room_name ||
        seed.storage_area_name ||
        seed.storage_area ||
        "Unassigned";
      const quantity = Number(seed.current_quantity) || 0;
      storageData[area] = (storageData[area] || 0) + quantity;
    });
    return {
      labels: Object.keys(storageData),
      datasets: [
        {
          data: Object.values(storageData),
          backgroundColor: COLORS,
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    };
  };

  const getVarietyDistributionData = () => {
    const varietyByType = {};
    const cropTotals = {};
    const varietyTotals = {};

    getFilteredSeeds().forEach((seed) => {
      const crop = (seed.crop_type || "").trim();
      const variety = (seed.variety || "").trim();
      const quantity = Number(seed.current_quantity) || 0;

      if (!varietyByType[crop]) varietyByType[crop] = {};
      varietyByType[crop][variety] = (varietyByType[crop][variety] || 0) + quantity;

      cropTotals[crop] = (cropTotals[crop] || 0) + quantity;
      varietyTotals[variety] = (varietyTotals[variety] || 0) + quantity;
    });

    const cropTypes = Object.keys(varietyByType).sort((a, b) => cropTotals[b] - cropTotals[a]);
    const allVarieties = Object.keys(varietyTotals).sort((a, b) => varietyTotals[b] - varietyTotals[a]);

    const CROP_THEMES = {
      soybean: ["#D4AF17", "#EBC844", "#F9E79F"],
      mungbean: ["#3B7A24", "#5D9B43", "#82C16E"],
      peanut: ["#5C3214", "#8B532B", "#C49268"],
    };

    const varietyColors = {};
    const cropColorIndex = {};

    getFilteredSeeds().forEach((seed) => {
      const variety = (seed.variety || "").trim();
      if (!varietyColors[variety]) {
        const crop = (seed.crop_type || "").trim().toLowerCase();
        const themeGroup = CROP_THEMES[crop] || COLORS;
        if (cropColorIndex[crop] === undefined) cropColorIndex[crop] = 0;
        varietyColors[variety] = themeGroup[cropColorIndex[crop] % themeGroup.length];
        cropColorIndex[crop]++;
      }
    });

    const datasets = allVarieties.map((variety) => ({
      label: variety,
      data: cropTypes.map((crop) => varietyByType[crop]?.[variety] || 0),
      backgroundColor: varietyColors[variety] || COLORS[0],
      borderColor: "#fff",
      borderWidth: 1,
    }));

    return {
      labels: cropTypes,
      datasets,
    };
  };

  const getProjectDistributionData = () => {
    const projData = {};
    
    // Initialize all projects with 0 quantity
    if (Array.isArray(reportData.projects)) {
      reportData.projects.forEach((proj) => {
        if (proj && proj.project_name) {
          projData[proj.project_name] = 0;
        }
      });
    }
    
    projData["Unassigned"] = 0;

    getFilteredSeeds().forEach((seed) => {
      const projName = seed.project_name || "Unassigned";
      const quantity = Number(seed.current_quantity) || 0;
      projData[projName] = (projData[projName] || 0) + quantity;
    });

    if (projData["Unassigned"] === 0) {
      delete projData["Unassigned"];
    }

    // Sort projects in descending order based on stock quantity (highest on left)
    const sortedProjects = Object.entries(projData).sort((a, b) => b[1] - a[1]);
    const labels = sortedProjects.map((entry) => entry[0]);
    const data = sortedProjects.map((entry) => entry[1]);

    return {
      labels,
      datasets: [
        {
          label: "Stock Quantity (kg)",
          data,
          backgroundColor: COLORS,
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    };
  };

  const getTransactionVolumeData = () => {
    const volumeData = {};
    getFilteredTransactions().forEach((transaction) => {
      const quantity = Number(transaction.quantity) || 0;
      volumeData[transaction.type] =
        (volumeData[transaction.type] || 0) + quantity;
    });
    return {
      labels: Object.keys(volumeData),
      datasets: [
        {
          label: "Quantity (kg)",
          data: Object.values(volumeData),
          backgroundColor: COLORS,
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    };
  };

  const getTransactionTrendsData = () => {
    const monthlyData = {};
    getFilteredTransactions().forEach((transaction) => {
      const date = new Date(transaction.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { "check-out": 0, disposal: 0, "check-in": 0 };
      }
      const type = (transaction.type || "").toLowerCase();
      if (type.includes("out")) {
        monthlyData[monthKey]["check-out"] += 1;
      } else if (type.includes("dispos")) {
        monthlyData[monthKey].disposal += 1;
      } else if (type.includes("in")) {
        monthlyData[monthKey]["check-in"] += 1;
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    return {
      labels: sortedMonths,
      datasets: [
        {
          label: "Check-outs",
          data: sortedMonths.map((m) => monthlyData[m]["check-out"] || 0),
          backgroundColor: "#3b82f6",
          borderColor: "#2563eb",
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        },
        {
          label: "Disposals",
          data: sortedMonths.map((m) => monthlyData[m].disposal || 0),
          backgroundColor: "#f59e0b",
          borderColor: "#d97706",
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        },
      ],
    };
  };

  // Helpers

  const getBadgeText = (reportId) => {
    switch (reportId) {
      case "crop-dist":
        return `${getCropDistributionData().labels.length} Crops`;
      case "storage":
        return `${getStorageUtilizationData().labels.length} Storage Areas`;
      case "variety": {
        const varieties = [...new Set(getFilteredSeeds().map((s) => s.variety))];
        return `${varieties.length} Total Varieties`;
      }
      case "project-dist":
        return `${getProjectDistributionData().labels.length} Projects`;
      case "trans-vol":
        return `${getTransactionVolumeData().labels.length} Transaction Types`;
      case "trans-trends":
        return `${getFilteredTransactions().length} Transactions`;
      default:
        return "";
    }
  };

  const getReportTableData = () => {
    switch (activeReport) {
      case "crop-dist": {
        const data = getCropDistributionData();
        const rows = data.labels.map((label, idx) => ({
          label: toTitleCase(label),
          value: `${data.datasets[0].data[idx].toFixed(2)} kg`,
        })).sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        return {
          headers: ["Crop Type", "Total Stock Quantity"],
          rows,
        };
      }
      case "storage": {
        const data = getStorageUtilizationData();
        const rows = data.labels.map((label, idx) => ({
          label: toTitleCase(label),
          value: `${data.datasets[0].data[idx].toFixed(2)} kg`,
        })).sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        return {
          headers: ["Storage Area", "Stock Quantity"],
          rows,
        };
      }
      case "variety": {
        const varietyByType = {};
        getFilteredSeeds().forEach((seed) => {
          const crop = toTitleCase(seed.crop_type || "");
          const variety = toTitleCase(seed.variety || "");
          const quantity = Number(seed.current_quantity) || 0;
          if (!varietyByType[crop]) varietyByType[crop] = {};
          varietyByType[crop][variety] = (varietyByType[crop][variety] || 0) + quantity;
        });
        const rows = [];
        Object.entries(varietyByType).forEach(([crop, vars]) => {
          Object.entries(vars).forEach(([variety, qty]) => {
            rows.push({
              label: `${crop} - ${variety}`,
              value: `${qty.toFixed(2)} kg`,
            });
          });
        });
        rows.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        return {
          headers: ["Crop & Variety", "Stock Quantity"],
          rows,
        };
      }
      case "project-dist": {
        const data = getProjectDistributionData();
        const rows = data.labels.map((label, idx) => ({
          label: toTitleCase(label),
          value: `${data.datasets[0].data[idx].toFixed(2)} kg`,
        }));
        return {
          headers: ["Project", "Stock Quantity"],
          rows,
        };
      }
      case "trans-vol": {
        const data = getTransactionVolumeData();
        const rows = data.labels.map((label, idx) => ({
          label: toTitleCase(label),
          value: `${data.datasets[0].data[idx].toFixed(2)} kg`,
        })).sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
        return {
          headers: ["Transaction Type", "Total Volume"],
          rows,
        };
      }
      case "trans-trends": {
        const monthlyData = {};
        getFilteredTransactions().forEach((transaction) => {
          const date = new Date(transaction.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { checkout: 0, disposal: 0 };
          }
          const type = (transaction.type || "").toLowerCase();
          if (type.includes("out")) {
            monthlyData[monthKey].checkout += 1;
          } else if (type.includes("dispos")) {
            monthlyData[monthKey].disposal += 1;
          }
        });
        const rows = Object.keys(monthlyData).sort().map((month) => ({
          label: month,
          value: `Check-outs: ${monthlyData[month].checkout} | Disposals: ${monthlyData[month].disposal}`,
        }));
        return {
          headers: ["Month", "Activity Summary"],
          rows,
        };
      }
      default:
        return null;
    }
  };

  const handleExport = (type) => {
    if (type === 'pdf') {
      window.print();
    } else {
      alert("CSV export triggered (Placeholder functionality).");
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          font: { size: 13 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  const varietyChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        position: "bottom",
        align: "center",
        labels: {
          padding: 15,
          boxWidth: 10,
          font: { size: 11 },
          usePointStyle: true,
        },
      },
    },
    scales: {
      x: {
        ticks: { 
          color: "#64748B",
          font: { size: 12, weight: "600" }, 
          maxRotation: 0, 
          minRotation: 0 
        },
      },
      y: {
        ticks: { font: { size: 11 } },
      },
    },
  };

  const projectChartOptions = {
    ...chartOptions,
    scales: {
      x: {
        ticks: { 
          color: "#64748B",
          font: { size: 11, weight: "600" }, 
          maxRotation: 45, 
          minRotation: 0,
          autoSkip: false
        },
      },
      y: {
        ticks: { font: { size: 11 } },
      },
    },
  };

  //  Early Returns for Loading/Auth/Error
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F7F5]">
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#1B5E20] border-t-transparent animate-spin"></div>
          <p className="text-[#1B5E20] font-medium text-sm">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!user || !canViewReports) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F7F5]">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-red-200">
          <p className="text-red-600 font-semibold text-lg mb-2">Access Denied</p>
          <p className="text-gray-600 mb-6 text-sm">You do not have permission to view reports.</p>
          <button onClick={() => navigate("/dashboard")} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F7F5]">
        <div className="text-center max-w-md mx-auto bg-white p-6 rounded-xl border border-red-200 shadow-sm">
          <p className="text-red-600 font-bold mb-2">Error loading reports</p>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <button
            onClick={fetchReportData}
            className="px-4 py-2 bg-[#1B5E20] text-white font-medium rounded-lg hover:bg-[#123e15] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Top Cards Computed Data
  const totalSeeds = reportData.seeds.length;
  const totalStock = reportData.seeds.reduce(
    (sum, seed) => sum + (Number(seed.current_quantity) || 0),
    0
  );
  const totalTransactions = reportData.transactions.length;
  const activeProjects = reportData.projects.length;

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 md:py-8 report-page-container" style={{ backgroundColor: "#F5F7F5" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chart-container-animate {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @media print {
          header, nav, aside, .no-print, button, select, .grid {
            display: none !important;
          }
          body, #root, main, .bg-white, .report-page-container {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .max-w-\[1600px\] {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .chart-container-animate {
            height: auto !important;
            min-height: auto !important;
            display: block !important;
          }
          .relative.min-h-\[400px\] {
            height: 380px !important;
            min-height: 380px !important;
            page-break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            margin-top: 15px !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-[320px] shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] overflow-hidden sticky top-6">
            <div className="p-5 border-b border-[#E0E0E0] bg-gray-50/50">
              <h2 className="text-lg font-bold text-[#1B5E20]">Reports Menu</h2>
              <p className="text-xs text-gray-500 mt-1">Select an item to view insights</p>
            </div>
            <nav className="p-3 flex flex-col gap-1.5">
              {REPORTS_NAV.map((item) => {
                const isActive = activeReport === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveReport(item.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive 
                        ? "bg-[#E8F5E9] text-[#1B5E20]" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className={`${isActive ? "text-[#1B5E20]" : "text-gray-500"}`}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MOBILE SUB-NAVIGATION (Scrollable Pills) */}
        <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-2 flex gap-2 hide-scrollbar">
          {REPORTS_NAV.map((item) => {
            const isActive = activeReport === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveReport(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive 
                    ? "bg-[#1B5E20] text-white border-[#1B5E20]" 
                    : "bg-white text-gray-600 border-[#E0E0E0] hover:bg-gray-50"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* MAIN COMPONENT */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border shadow-sm border-[#E0E0E0] flex flex-col gap-1 justify-center relative overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Seed Lots</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-extrabold text-[#558B2F]">{totalSeeds}</p>
                <span className="text-4xl text-[#558B2F] opacity-80">🌱</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border shadow-sm border-[#E0E0E0] flex flex-col gap-1 justify-center relative overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Stock (kg)</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-extrabold text-[#558B2F]">{totalStock.toFixed(1)}</p>
                <span className="text-4xl text-[#558B2F] opacity-80">📦</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border shadow-sm border-[#E0E0E0] flex flex-col gap-1 justify-center relative overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Transactions</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-extrabold text-[#558B2F]">{totalTransactions}</p>
                <span className="text-4xl text-[#558B2F] opacity-80">📊</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border shadow-sm border-[#E0E0E0] flex flex-col gap-1 justify-center relative overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active Projects</p>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-extrabold text-[#558B2F]">{activeProjects}</p>
                <span className="text-4xl text-[#558B2F] opacity-80">📋</span>
              </div>
            </div>
          </div>

          {/* Active Report View */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] p-6 lg:p-8 flex-1 min-h-[500px] flex flex-col">
            {!activeReport ? (
              // Empty / Placeholder State
              <div className="flex-1 flex flex-col items-center justify-center text-center chart-container-animate">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                  <span className="text-4xl text-gray-300">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Reports & Analytics</h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  Select a report category from the sidebar navigation to view detailed insights and visualizations.
                </p>
              </div>
            ) : (
              // Chart View
              <div key={activeReport} className="flex-1 flex flex-col chart-container-animate">
                {/* Dynamic Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#E0E0E0]">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                      {REPORTS_NAV.find(r => r.id === activeReport)?.label}
                    </h2>
                    <span 
                      className="inline-flex px-2.5 py-1 rounded bg-[#E8F5E9] text-[#1B5E20] text-xs font-bold uppercase tracking-wider items-center"
                    >
                      {getBadgeText(activeReport)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 relative no-print">
                    {activeReport !== "project-dist" && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-600">Project:</label>
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-[#116B2B] focus:border-[#116B2B] font-medium outline-none cursor-pointer"
                        >
                          <option value="">All Projects</option>
                          {reportData.projects.map((p) => (
                            <option key={p.project_id} value={p.project_id}>
                              {p.project_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button 
                      onClick={() => handleExport('pdf')} 
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#116B2B] text-white hover:bg-[#0e5c24] border border-transparent focus:outline-none transition-colors"
                    >
                      Export as PDF
                    </button>
                  </div>
                </div>
                
                {/* Chart Area */}
                <div className="flex-1 w-full min-h-[400px] relative">
                  {/* CROP DISTRIBUTION */}
                  {activeReport === "crop-dist" && (
                    getCropDistributionData().labels.length > 0 ? (
                      <Pie data={getCropDistributionData()} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
                    )
                  )}

                  {/* STORAGE UTILIZATION */}
                  {activeReport === "storage" && (
                    getStorageUtilizationData().labels.length > 0 ? (
                      <Doughnut data={getStorageUtilizationData()} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
                    )
                  )}

                  {/* VARIETY DISTRIBUTION */}
                  {activeReport === "variety" && (
                    getVarietyDistributionData().labels.length > 0 ? (
                      <Bar data={getVarietyDistributionData()} options={varietyChartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
                    )
                  )}

                  {/* PROJECT STOCK DISTRIBUTION */}
                  {activeReport === "project-dist" && (
                    getProjectDistributionData().labels.length > 0 ? (
                      <Bar data={getProjectDistributionData()} options={projectChartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
                    )
                  )}

                  {/* TRANSACTION VOLUME */}
                  {activeReport === "trans-vol" && (
                    getTransactionVolumeData().labels.length > 0 ? (
                      <Bar data={getTransactionVolumeData()} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
                    )
                  )}

                  {/* TRANSACTION TRENDS */}
                  {activeReport === "trans-trends" && (
                    getTransactionTrendsData().labels.length > 0 ? (
                      <Line data={getTransactionTrendsData()} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No data available</div>
                    )
                  )}
                </div>

                {/* Data Table Breakdown - Screen & Print */}
                {activeReport && getReportTableData() && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Data Breakdown
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            {getReportTableData()?.headers.map((header) => (
                              <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getReportTableData()?.rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {row.label}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-semibold">
                                {row.value}
                              </td>
                            </tr>
                          ))}
                          {(!getReportTableData()?.rows || getReportTableData()?.rows.length === 0) && (
                            <tr>
                              <td
                                colSpan="2"
                                className="px-6 py-4 text-center text-sm text-gray-400"
                              >
                                No data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
        </main>
      </div>
    </div>
  );
};

export default Reports;
