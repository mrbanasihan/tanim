import React, { useEffect, useState } from "react";
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/admin/rooms", form);
    setForm(emptyRoom);
    await loadRooms();
  };

  const handleDelete = async (roomId) => {
    await api.delete(`/admin/rooms/${roomId}`, { data: { actor: "admin-ui" } });
    await loadRooms();
  };

  return (
    <div className="panel">
      <div className="hero">
        <h2>Room Management</h2>
        <p>Manage storage and processing rooms in a cleaner admin workflow.</p>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <div className="section-kicker">Create room</div>
            <h3 style={{ margin: 0 }}>New room profile</h3>
            <p className="section-description">
              Keep the room name, location, and temperature range together so it
              reads like a catalog entry.
            </p>
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
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="4" className="notice">
                    No rooms found.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
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
