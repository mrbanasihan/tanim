import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const SeedList = () => {
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    crop_type: "",
    variety: "",
    generation: "",
  });

  useEffect(() => {
    fetchSeeds();
  }, [filters]);

  const fetchSeeds = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/seeds?${params}`);
      setSeeds(response.data);
    } catch (error) {
      console.error("Error fetching seeds:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
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
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seed Lots</h1>
        <Link
          to="/seeds/new"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add New Seed Lot
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            name="crop_type"
            placeholder="Crop Type"
            value={filters.crop_type}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            name="variety"
            placeholder="Variety"
            value={filters.variety}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            name="generation"
            placeholder="Generation"
            value={filters.generation}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lot Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Crop Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variety
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {seeds.map((seed) => (
              <tr key={seed.seed_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {seed.batch_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {seed.crop_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {seed.variety}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {seed.current_quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {seed.is_active ? "Active" : "Inactive"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/seeds/${seed.seed_id}`}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    View
                  </Link>
                  <Link
                    to={`/seeds/${seed.seed_id}/edit`}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(seed.seed_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {seeds.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No seed lots found
          </div>
        )}
      </div>
    </div>
  );
};

export default SeedList;
