import React, { useEffect, useState } from "react";
import api from "../services/api";

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

  const loadUsers = async () => {
    const response = await api.get("/admin/users");
    setUsers(response.data.data || []);
  };

  useEffect(() => {
    loadUsers().catch(() => setUsers([]));
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
        <p>Add, update, delete, and reassign TANIM users.</p>
      </div>

      <form
        className="form-stack"
        onSubmit={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <div className="form-grid">
          <div>
            <label className="label">First name</label>
            <input
              className="input"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Last name</label>
            <input
              className="input"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
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
        <button className="button" type="submit">
          Create user
        </button>
      </form>

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
                  <td>{String(user.is_active)}</td>
                  <td>
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => handleDelete(user.user_id)}
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
    </div>
  );
};

export default UsersPage;
