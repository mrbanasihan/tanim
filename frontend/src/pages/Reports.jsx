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
} from "chart.js";
import { Pie, Bar, Doughnut } from "react-chartjs-2";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { canAccessFeature, filterByCropGroup } from "../utils/accessControl";
import { getSelectedCropGroup } from "../constants/cropCatalog";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
);

// Reports
// Generates and displays charts for seeds, transactions, and projects; enforces role-based report access
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

  const COLORS = [
    "#10b981",
    "#34d399",
    "#6ee7b7",
    "#a7f3d0",
    "#059669",
    "#047857",
  ];

  useEffect(() => {
    if (authLoading) {
      return;
    }

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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !canViewReports) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg mb-4">
            Access Denied
          </p>
          <p className="text-gray-600 mb-6">
            You do not have permission to view reports.
          </p>
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

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

      console.log("Report data loaded:", {
        seeds: (seedsRes.data || []).length,
        transactions: (transactionsRes.data || []).length,
        projects: (projectsRes.data || []).length,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError(error.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto bg-red-50 p-6 rounded-lg border border-red-200">
          <p className="text-red-600 font-medium mb-4">Error loading reports</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchReportData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Crop Distribution Data
  const getCropDistributionData = () => {
    const cropData = {};
    reportData.seeds.forEach((seed) => {
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

  // Storage Area Utilization
  const getStorageUtilizationData = () => {
    const storageData = {};
    reportData.seeds.forEach((seed) => {
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

  // Status Distribution
  const getStatusDistributionData = () => {
    const statusData = { Active: 0, Inactive: 0 };
    reportData.seeds.forEach((seed) => {
      if (seed.is_active) {
        statusData.Active += 1;
      } else {
        statusData.Inactive += 1;
      }
    });

    return {
      labels: Object.keys(statusData),
      datasets: [
        {
          data: Object.values(statusData),
          backgroundColor: ["#10b981", "#ef4444"],
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    };
  };

  // Transaction Volume by Type
  const getTransactionVolumeData = () => {
    const volumeData = {};
    reportData.transactions.forEach((transaction) => {
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

  // Transaction Trends Over Time
  const getTransactionTrendsData = () => {
    const monthlyData = {};
    reportData.transactions.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { "check-out": 0, disposal: 0 };
      }
      if (transaction.type === "check-out") {
        monthlyData[monthKey]["check-out"] += 1;
      } else if (transaction.type === "disposal") {
        monthlyData[monthKey].disposal += 1;
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();

    return {
      labels: sortedMonths,
      datasets: [
        {
          label: "Check-out",
          data: sortedMonths.map((m) => monthlyData[m]["check-out"]),
          backgroundColor: "#3b82f6",
          borderColor: "#1d4ed8",
          borderWidth: 2,
        },
        {
          label: "Disposal",
          data: sortedMonths.map((m) => monthlyData[m].disposal),
          backgroundColor: "#f59e0b",
          borderColor: "#d97706",
          borderWidth: 2,
        },
      ],
    };
  };

  // Variety Distribution per Crop
  const getVarietyDistributionData = () => {
    const varietyByType = {};
    reportData.seeds.forEach((seed) => {
      if (!varietyByType[seed.crop_type]) {
        varietyByType[seed.crop_type] = {};
      }
      const quantity = Number(seed.current_quantity) || 0;
      varietyByType[seed.crop_type][seed.variety] =
        (varietyByType[seed.crop_type][seed.variety] || 0) + quantity;
    });

    const cropTypes = Object.keys(varietyByType);
    const allVarieties = [...new Set(reportData.seeds.map((s) => s.variety))];

    const datasets = allVarieties.map((variety, index) => ({
      label: variety,
      data: cropTypes.map((crop) => varietyByType[crop][variety] || 0),
      backgroundColor: COLORS[index % COLORS.length],
      borderColor: "#fff",
      borderWidth: 1,
    }));

    return {
      labels: cropTypes,
      datasets,
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto bg-red-50 p-6 rounded-lg border border-red-200">
          <p className="text-red-600 font-medium mb-4">Error loading reports</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchReportData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalSeeds = reportData.seeds.length;
  const totalStock = reportData.seeds.reduce(
    (sum, seed) => sum + (Number(seed.current_quantity) || 0),
    0,
  );
  const totalTransactions = reportData.transactions.length;
  const activeProjects = reportData.projects.length;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900">
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Comprehensive insights into your seed management operations
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Seed Lots
                </p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {totalSeeds}
                </p>
              </div>
              <div className="text-3xl text-green-200">🌱</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Stock (kg)
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {totalStock.toFixed(1)}
                </p>
              </div>
              <div className="text-3xl text-blue-200">📦</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {totalTransactions}
                </p>
              </div>
              <div className="text-3xl text-purple-200">📊</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Active Projects
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {activeProjects}
                </p>
              </div>
              <div className="text-3xl text-orange-200">📋</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Crop Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Crop Distribution
            </h2>
            <div className="h-80">
              {getCropDistributionData().labels.length > 0 ? (
                <Pie data={getCropDistributionData()} options={chartOptions} />
              ) : (
                <p className="text-slate-500 text-center h-full flex items-center justify-center">
                  No data available
                </p>
              )}
            </div>
          </div>

          {/* Storage Utilization */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Storage Area Utilization
            </h2>
            <div className="h-80">
              {getStorageUtilizationData().labels.length > 0 ? (
                <Doughnut
                  data={getStorageUtilizationData()}
                  options={chartOptions}
                />
              ) : (
                <p className="text-slate-500 text-center h-full flex items-center justify-center">
                  No data available
                </p>
              )}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Seed Lot Status
            </h2>
            <div className="h-80">
              <Pie data={getStatusDistributionData()} options={chartOptions} />
            </div>
          </div>

          {/* Transaction Volume */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Transaction Volume by Type
            </h2>
            <div className="h-80">
              {getTransactionVolumeData().labels.length > 0 ? (
                <Bar data={getTransactionVolumeData()} options={chartOptions} />
              ) : (
                <p className="text-slate-500 text-center h-full flex items-center justify-center">
                  No transaction data available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Full Width Charts */}
        <div className="space-y-6">
          {/* Variety Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Variety Distribution per Crop
            </h2>
            <div className="h-96">
              {getVarietyDistributionData().labels.length > 0 ? (
                <Bar
                  data={getVarietyDistributionData()}
                  options={chartOptions}
                />
              ) : (
                <p className="text-slate-500 text-center h-full flex items-center justify-center">
                  No variety data available
                </p>
              )}
            </div>
          </div>

          {/* Transaction Trends */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Transaction Trends Over Time
            </h2>
            <div className="h-96">
              {getTransactionTrendsData().labels.length > 0 ? (
                <Bar data={getTransactionTrendsData()} options={chartOptions} />
              ) : (
                <p className="text-slate-500 text-center h-full flex items-center justify-center">
                  No transaction trend data available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
