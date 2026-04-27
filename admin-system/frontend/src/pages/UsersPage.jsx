import React, { useEffect, useState } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

const emptyUser = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "guest",
  is_active: true,
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data.data || []);
      setError("");
    } catch (err) {
      setUsers([]);
      setError(
        getErrorMessage(
          err,
          "Unable to load users. Check admin backend URL and database configuration.",
        ),
      );
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/admin/users", form);
    setForm(emptyUser);
    await loadUsers();
  };

  const handleRoleChange = async (userId, role) => {
    await api.put(`/admin/users/${userId}/role`, { role, actor: "admin-ui" });
    await loadUsers();
  };

  const handleDelete = async (userId) => {
    await api.delete(`/admin/users/${userId}`, { data: { actor: "admin-ui" } });
    await loadUsers();
  };

  return (
    <div className="panel">
      <div className="hero">
        <h2>User Management</h2>
        <p>
          Add, update, and deactivate TANIM users while keeping the roster
          readable for admin staff.
        </p>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <div className="section-kicker">Create account</div>
            <h3 style={{ margin: 0 }}>New user profile</h3>
            <p className="section-description">
              Capture the full identity up front so audit logs and user rows are
              easy to scan later.
            </p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">admin</option>
                <option value="researcher">researcher</option>
                <option value="staff">staff</option>
                <option value="guest">guest</option>
              </select>
            </div>
            <div>
              <label className="label">Active</label>
              <select
                className="select"
                value={String(form.is_active)}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.value === "true" })
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              Create user
            </button>
            <span className="field-hint">
              Deleting a user now deactivates the account instead of removing
              it.
            </span>
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <div className="section-kicker">Current roster</div>
            <h3 style={{ margin: 0 }}>User list</h3>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="notice">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      {user.first_name} {user.last_name}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        className="select"
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.user_id, e.target.value)
                        }
                      >
                        <option value="admin">admin</option>
                        <option value="researcher">researcher</option>
                        <option value="staff">staff</option>
                        <option value="guest">guest</option>
                      </select>
                    </td>
                    <td>
                      <span
                        className={
                          user.is_active ? "pill create" : "pill soft-delete"
                        }
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button danger"
                        type="button"
                        onClick={() => handleDelete(user.user_id)}
                        disabled={!user.is_active}
                      >
                        {user.is_active ? "Deactivate" : "Inactive"}
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

export default UsersPage;
