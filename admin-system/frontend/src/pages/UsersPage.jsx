import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

const emptyUser = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "guest",
  is_active: true,
  crop_groups: [],
};

const cropGroupOptions = [
  { value: "legumes", label: "Legumes" },
  { value: "cereals", label: "Cereals" },
  { value: "vegetables", label: "Vegetables" },
];

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState("");

  // Filter and search state
  const [searchText, setSearchText] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterCropGroup, setFilterCropGroup] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

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

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchText) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (user) =>
          user.first_name.toLowerCase().includes(query) ||
          user.last_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
    }

    // Role filter
    if (filterRole) {
      result = result.filter((user) => user.role === filterRole);
    }

    // Crop group filter
    if (filterCropGroup) {
      result = result.filter(
        (user) =>
          Array.isArray(user.crop_groups) &&
          user.crop_groups.includes(filterCropGroup),
      );
    }

    // Active filter
    if (filterActive !== "") {
      const isActive = filterActive === "true";
      result = result.filter((user) => user.is_active === isActive);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "name") {
        aVal = `${a.first_name} ${a.last_name}`;
        bVal = `${b.first_name} ${b.last_name}`;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    users,
    searchText,
    filterRole,
    filterCropGroup,
    filterActive,
    sortBy,
    sortOrder,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post("/admin/users", form);
      setForm(emptyUser);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create user."));
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role, actor: "admin-ui" });
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update user role."));
    }
  };

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`, {
        data: { actor: "admin-ui" },
      });
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to deactivate user."));
    }
  };

  const toggleCropGroup = (group) => {
    const current = form.crop_groups || [];
    const updated = current.includes(group)
      ? current.filter((g) => g !== group)
      : [...current, group];
    setForm({ ...form, crop_groups: updated });
  };

  const getCropGroupBadges = (groups) => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return "-";
    }
    return groups.map((g) => (
      <span
        key={g}
        className="pill create"
        style={{ display: "inline-block", marginRight: "4px" }}
      >
        {cropGroupOptions.find((opt) => opt.value === g)?.label || g}
      </span>
    ));
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
                required
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
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
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
            {form.role !== "admin" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="label">Assign crop groups</label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {cropGroupOptions.map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.crop_groups.includes(option.value)}
                        onChange={() => toggleCropGroup(option.value)}
                        disabled={form.role === "admin"}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {form.role === "admin" && (
                  <p className="field-hint">
                    Admins have access to all crop groups.
                  </p>
                )}
              </div>
            )}
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
                placeholder="Name or email"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div>
              <label className="label" style={{ fontSize: "0.8rem" }}>
                Role
              </label>
              <select
                className="select"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All roles</option>
                <option value="admin">admin</option>
                <option value="researcher">researcher</option>
                <option value="staff">staff</option>
                <option value="guest">guest</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: "0.8rem" }}>
                Crop Group
              </label>
              <select
                className="select"
                value={filterCropGroup}
                onChange={(e) => setFilterCropGroup(e.target.value)}
              >
                <option value="">All groups</option>
                <option value="legumes">Legumes</option>
                <option value="cereals">Cereals</option>
                <option value="vegetables">Vegetables</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: "0.8rem" }}>
                Status
              </label>
              <select
                className="select"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
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
                <option value="email">Email</option>
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
                <th>Email</th>
                <th>Role</th>
                <th>Crop Groups</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="notice">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
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
                    <td>{getCropGroupBadges(user.crop_groups)}</td>
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
