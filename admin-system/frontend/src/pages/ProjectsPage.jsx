import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

const emptyProject = {
  project_name: "",
  project_code: "",
  description: "",
  start_date: "",
  end_date: "",
  crop_groups: [],
};

const cropGroupOptions = [
  { value: "legumes", label: "Legumes" },
  { value: "cereals", label: "Cereals" },
  { value: "vegetables", label: "Vegetables" },
];

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyProject);
  const [error, setError] = useState("");

  // Filter and search state
  const [searchText, setSearchText] = useState("");
  const [filterCropGroup, setFilterCropGroup] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const loadProjects = async () => {
    try {
      const response = await api.get("/admin/projects");
      setProjects(response.data.data || []);
      setError("");
    } catch (err) {
      setProjects([]);
      setError(
        getErrorMessage(
          err,
          "Unable to load projects. Check admin backend URL and database configuration.",
        ),
      );
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search filter
    if (searchText) {
      const query = searchText.toLowerCase();
      result = result.filter(
        (project) =>
          project.project_name.toLowerCase().includes(query) ||
          (project.project_code &&
            project.project_code.toLowerCase().includes(query)) ||
          (project.description &&
            project.description.toLowerCase().includes(query)),
      );
    }

    // Crop group filter
    if (filterCropGroup) {
      result = result.filter(
        (project) =>
          Array.isArray(project.crop_groups) &&
          project.crop_groups.includes(filterCropGroup),
      );
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "name") {
        aVal = a.project_name;
        bVal = b.project_name;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [projects, searchText, filterCropGroup, sortBy, sortOrder]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post("/admin/projects", form);
      setForm(emptyProject);
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create project."));
    }
  };

  const handleDelete = async (projectId) => {
    try {
      await api.delete(`/admin/projects/${projectId}`, {
        data: { actor: "admin-ui" },
      });
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete project."));
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
        <h2>Project Management</h2>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="section-card" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <div>
            <div className="section-kicker">Create project</div>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label className="label">Project name</label>
              <input
                className="input"
                value={form.project_name}
                onChange={(e) =>
                  setForm({ ...form, project_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Project code</label>
              <input
                className="input"
                value={form.project_code}
                onChange={(e) =>
                  setForm({ ...form, project_code: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Start date</label>
              <input
                className="input"
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">End date</label>
              <input
                className="input"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="label">Description</label>
              <textarea
                className="textarea"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
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
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit">
              Create project
            </button>
            <span className="field-hint">
              Project deletes remain hard deletes in the current schema.
            </span>
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-head">
          <div>
            <div className="section-kicker">Project list</div>
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
                placeholder="Name, code, or description"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
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
                <th>Code</th>
                <th>Crop Groups</th>
                <th>Dates</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="notice">
                    No projects found.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.project_id}>
                    <td>{project.project_name}</td>
                    <td>{project.project_code || "-"}</td>
                    <td>{getCropGroupBadges(project.crop_groups)}</td>
                    <td>
                      {project.start_date || "-"} → {project.end_date || "-"}
                    </td>
                    <td>{project.description || "-"}</td>
                    <td>
                      <button
                        className="button danger"
                        type="button"
                        onClick={() => handleDelete(project.project_id)}
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

export default ProjectsPage;
