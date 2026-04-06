const db = require("../services/db");

const ProjectModel = {
  // Get all projects
  async getAll() {
    const query = `SELECT * FROM projects ORDER BY created_at DESC`;
    const result = await db.query(query);
    return result.rows;
  },

  // Get project by ID
  async getById(projectId) {
    const query = `SELECT * FROM projects WHERE project_id = $1`;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  },

  // Create new project
  async create(projectName, description, startDate, endDate, createdBy) {
    const query = `
      INSERT INTO projects (project_id, project_name, description, start_date, end_date, created_by, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await db.query(query, [
      projectName,
      description,
      startDate,
      endDate,
      createdBy,
    ]);
    return result.rows[0];
  },

  // Update project
  async update(projectId, projectName, description, startDate, endDate) {
    const query = `
      UPDATE projects 
      SET project_name = $1, description = $2, start_date = $3, end_date = $4
      WHERE project_id = $5
      RETURNING *
    `;
    const result = await db.query(query, [
      projectName,
      description,
      startDate,
      endDate,
      projectId,
    ]);
    return result.rows[0];
  },

  // Delete project
  async delete(projectId) {
    const query = `DELETE FROM projects WHERE project_id = $1 RETURNING project_id`;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  },
};

module.exports = ProjectModel;
