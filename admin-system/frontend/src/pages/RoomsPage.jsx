import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

const emptyRoom = {
  room_name: "",
  building_location: "",
  optimal_temp: "",
  temp_start: "",
  temp_end: "",
};

const RoomsPage = () => {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(emptyRoom);
  const [error, setError] = useState("");

  // Filter and search state
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const loadRooms = async () => {
    try {
      const response = await api.get("/admin/rooms");
      setRooms(response.data.data || []);
      setError("");
    } catch (err) {
      setRooms([]);
      setError(
        getErrorMessage(
          err,
          "Unable to load rooms. Check admin backend URL and database configuration.",
        ),
      );
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    let result = [...rooms];

    // Search filter
    if (searchText) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (room) =>
          room.room_name.toLowerCase().includes(query) ||
          (room.building_location &&
            room.building_location.toLowerCase().includes(query)),
      );
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "name") {
        aVal = a.room_name;
        bVal = b.room_name;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rooms, searchText, sortBy, sortOrder]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post("/admin/rooms", form);
      setForm(emptyRoom);
      await loadRooms();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create room."));
    }
  };

  const handleDelete = async (roomId) => {
    try {
      await api.delete(`/admin/rooms/${roomId}`, {
        data: { actor: "admin-ui" },
      });
      await loadRooms();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete room."));
    }
  };

  return (
    <div className="panel">
      <div className="hero">
        <h2>Room Management</h2>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <div className="section-kicker">Create room</div>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label className="label">Room name</label>
              <input
                className="input"
                value={form.room_name}
                onChange={(e) =>
                  setForm({ ...form, room_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Building location</label>
              <input
                className="input"
                value={form.building_location}
                onChange={(e) =>
                  setForm({ ...form, building_location: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Optimal temp</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={form.optimal_temp}
                onChange={(e) =>
                  setForm({ ...form, optimal_temp: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Temp start</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={form.temp_start}
                onChange={(e) =>
                  setForm({ ...form, temp_start: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Temp end</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={form.temp_end}
                onChange={(e) => setForm({ ...form, temp_end: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              Create room
            </button>
            <span className="field-hint">
              Room deletes remain hard deletes in the current schema.
            </span>
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <div className="section-kicker">Room list</div>
            <h3 style={{ margin: 0 }}>Active records</h3>
          </div>
        </div>

        {/* Filters and search */}
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <label className="label" style={{ fontSize: "0.8rem" }}>
                Search
              </label>
              <input
                className="input"
                type="text"
                placeholder="Room name or location"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div>
              <label className="label" style={{ fontSize: "0.8rem" }}>
                Sort by
              </label>
              <select
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_at">Created</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: "0.8rem" }}>
                Order
              </label>
              <select
                className="select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest</option>
                <option value="asc">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Temperature range</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan="4" className="notice">
                    No rooms found.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.room_id}>
                    <td>{room.room_name}</td>
                    <td>{room.building_location || "-"}</td>
                    <td>
                      {room.temp_start || "-"} → {room.temp_end || "-"} (opt{" "}
                      {room.optimal_temp || "-"})
                    </td>
                    <td>
                      <button
                        className="button danger"
                        type="button"
                        onClick={() => handleDelete(room.room_id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RoomsPage;
