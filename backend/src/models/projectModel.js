const db = require("../services/db");

const ProjectModel = {
  // Get all projects
  async getAll() {
    const query = `SELECT * FROM project ORDER BY created_at DESC`;
    const result = await db.query(query);
    return result.rows;
  },

  // Get project by ID
  async getById(projectId) {
    const query = `SELECT * FROM project WHERE project_id = $1`;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  },

  // Create new project
  async create(
    projectName,
    description,
    startDate,
    endDate,
    projectCode,
    createdBy,
  ) {
    const query = `
      INSERT INTO project (project_id, project_name, project_code, description, start_date, end_date, created_by, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;
    const result = await db.query(query, [
      projectName,
      projectCode || null,
      description,
      startDate,
      endDate,
      createdBy,
    ]);
    return result.rows[0];
  },

  // Update project
  async update(
    projectId,
    projectName,
    description,
    startDate,
    endDate,
    projectCode,
  ) {
    const query = `
      UPDATE project 
      SET project_name = $1, project_code = $2, description = $3, start_date = $4, end_date = $5
      WHERE project_id = $6
      RETURNING *
    `;
    const result = await db.query(query, [
      projectName,
      projectCode || null,
      description,
      startDate,
      endDate,
      projectId,
    ]);
    return result.rows[0];
  },

  // Delete project
  async delete(projectId) {
    const query = `DELETE FROM project WHERE project_id = $1 RETURNING project_id`;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  },
};

module.exports = ProjectModel;
