import React, { useEffect, useState } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

const emptyProject = {
  project_name: "",
  project_code: "",
  description: "",
  start_date: "",
  end_date: "",
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyProject);
  const [error, setError] = useState("");

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/admin/projects", form);
    setForm(emptyProject);
    await loadProjects();
  };

  const handleDelete = async (projectId) => {
    await api.delete(`/admin/projects/${projectId}`, {
      data: { actor: "admin-ui" },
    });
    await loadProjects();
  };

  return (
    <div className="panel">
      <div className="hero">
        <h2>Project Management</h2>
        <p>Create and maintain TANIM research projects.</p>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}

      <form
        className="form-stack"
        onSubmit={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <div className="form-grid">
          <div>
            <label className="label">Project name</label>
            <input
              className="input"
              value={form.project_name}
              onChange={(e) =>
                setForm({ ...form, project_name: e.target.value })
              }
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
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
        </div>
        <button className="button" type="submit">
          Create project
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Dates</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan="5" className="notice">
                  No projects found.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.project_id}>
                  <td>{project.project_name}</td>
                  <td>{project.project_code || "-"}</td>
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
    </div>
  );
};

export default ProjectsPage;
