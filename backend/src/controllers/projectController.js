const ProjectModel = require("../models/projectModel");
const UserModel = require("../models/userModel");
const { sanitizeString, sanitizeTitleCase } = require("../utils/validation");
const { CROP_GROUPS } = require("../constants/cropCatalog");

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const normalizeProjectCropGroups = (rawValue, defaultToLegumes = false) => {
  if (rawValue === undefined || rawValue === null) {
    return defaultToLegumes ? ["legumes"] : null;
  }

  const values = Array.isArray(rawValue)
    ? rawValue
    : String(rawValue)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  const normalized = [
    ...new Set(values.map((group) => String(group).toLowerCase())),
  ];
  const invalid = normalized.filter((group) => !CROP_GROUPS.includes(group));

  if (invalid.length > 0) {
    return { error: `Invalid crop groups: ${invalid.join(", ")}` };
  }

  if (defaultToLegumes && normalized.length === 0) {
    return ["legumes"];
  }

  return normalized;
};

const ProjectController = {
  // GET /api/projects
  async getAll(req, res) {
    try {
      const requestedCropGroup = (req.query.crop_group || "").toString().trim();
      const projects = await ProjectModel.getAll();

      if (req.user?.role === "admin") {
        if (requestedCropGroup) {
          return res.json(
            projects.filter((project) =>
              (project.crop_groups || []).includes(requestedCropGroup),
            ),
          );
        }
        return res.json(projects);
      }

      const user = await UserModel.findById(req.user.userId);
      const assignedGroups = Array.isArray(user?.crop_groups)
        ? user.crop_groups
        : [];
      const effectiveGroups = requestedCropGroup
        ? assignedGroups.includes(requestedCropGroup)
          ? [requestedCropGroup]
          : []
        : assignedGroups;

      const filtered = projects.filter((project) =>
        (project.crop_groups || []).some((group) =>
          effectiveGroups.includes(group),
        ),
      );

      res.json(filtered);
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
      const {
        projectName,
        description,
        startDate,
        endDate,
        projectCode,
        crop_groups,
        cropGroups,
        crop_group,
      } = req.body;

      const normalizedProjectName = sanitizeTitleCase(projectName);
      const normalizedDescription = sanitizeString(description);
      const normalizedProjectCode = sanitizeString(projectCode);

      if (!normalizedProjectName) {
        return res.status(400).json({ error: "Project name is required" });
      }

      const rawCropGroups = cropGroups ?? crop_groups ?? crop_group;
      const normalizedCropGroups = normalizeProjectCropGroups(
        rawCropGroups,
        true,
      );
      if (normalizedCropGroups?.error) {
        return res.status(400).json({ error: normalizedCropGroups.error });
      }

      const project = await ProjectModel.create(
        normalizedProjectName,
        normalizedDescription,
        startDate,
        endDate,
        normalizedProjectCode,
        req.user.userId,
        normalizedCropGroups,
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
      const {
        projectName,
        description,
        startDate,
        endDate,
        projectCode,
        crop_groups,
        cropGroups,
        crop_group,
      } = req.body;

      const normalizedProjectName = sanitizeTitleCase(projectName);
      const normalizedDescription = sanitizeString(description);
      const normalizedProjectCode = sanitizeString(projectCode);

      const cropGroupPayloadProvided =
        hasOwn(req.body, "cropGroups") ||
        hasOwn(req.body, "crop_groups") ||
        hasOwn(req.body, "crop_group");

      const normalizedCropGroups = cropGroupPayloadProvided
        ? normalizeProjectCropGroups(
            cropGroups ?? crop_groups ?? crop_group,
            true,
          )
        : null;
      if (normalizedCropGroups?.error) {
        return res.status(400).json({ error: normalizedCropGroups.error });
      }

      const project = await ProjectModel.update(
        id,
        normalizedProjectName,
        normalizedDescription,
        startDate,
        endDate,
        normalizedProjectCode,
        Array.isArray(normalizedCropGroups) ? normalizedCropGroups : undefined,
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
