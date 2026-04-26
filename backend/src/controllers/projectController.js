const ProjectModel = require("../models/projectModel");
const { sanitizeString, sanitizeTitleCase } = require("../utils/validation");

const ProjectController = {
  // GET /api/projects
  async getAll(req, res) {
    try {
      const projects = await ProjectModel.getAll();
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/projects/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const project = await ProjectModel.getById(id);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/projects
  async create(req, res) {
    try {
      const { projectName, description, startDate, endDate, projectCode } =
        req.body;

      const normalizedProjectName = sanitizeTitleCase(projectName);
      const normalizedDescription = sanitizeString(description);
      const normalizedProjectCode = sanitizeString(projectCode);

      if (!normalizedProjectName) {
        return res.status(400).json({ error: "Project name is required" });
      }

      const project = await ProjectModel.create(
        normalizedProjectName,
        normalizedDescription,
        startDate,
        endDate,
        normalizedProjectCode,
        req.user.userId,
      );

      res.status(201).json(project);
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // PUT /api/projects/:id
  async update(req, res) {
    try {
      const { id } = req.params;
      const { projectName, description, startDate, endDate, projectCode } =
        req.body;

      const normalizedProjectName = sanitizeTitleCase(projectName);
      const normalizedDescription = sanitizeString(description);
      const normalizedProjectCode = sanitizeString(projectCode);

      const project = await ProjectModel.update(
        id,
        normalizedProjectName,
        normalizedDescription,
        startDate,
        endDate,
        normalizedProjectCode,
      );

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // DELETE /api/projects/:id
  async delete(req, res) {
    try {
      const { id } = req.params;
      const project = await ProjectModel.delete(id);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = ProjectController;
