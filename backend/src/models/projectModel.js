const db = require("../services/db");

const ensureProjectCropGroupTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS project_crop_group (
      project_id UUID REFERENCES project(project_id) ON DELETE CASCADE,
      crop_group crop_group NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, crop_group)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_project_crop_group_group
      ON project_crop_group(crop_group)
  `);

  // Bootstrap legacy projects so they immediately participate in crop-group filtering.
  await db.query(`
    INSERT INTO project_crop_group (project_id, crop_group)
    SELECT p.project_id, 'legumes'::crop_group
    FROM project p
    WHERE NOT EXISTS (
      SELECT 1
      FROM project_crop_group pcg
      WHERE pcg.project_id = p.project_id
    )
    ON CONFLICT (project_id, crop_group) DO NOTHING
  `);
};

const normalizeGroups = (groups) => {
  const input = Array.isArray(groups) ? groups : [groups];
  return [...new Set(input.filter(Boolean))];
};

const assignProjectCropGroups = async (client, projectId, groups) => {
  const normalizedGroups = normalizeGroups(groups);

  await client.query(`DELETE FROM project_crop_group WHERE project_id = $1`, [
    projectId,
  ]);

  if (normalizedGroups.length === 0) {
    return;
  }

  await client.query(
    `
      INSERT INTO project_crop_group (project_id, crop_group)
      SELECT $1::uuid, UNNEST($2::crop_group[])
      ON CONFLICT (project_id, crop_group) DO NOTHING
    `,
    [projectId, normalizedGroups],
  );
};

const ProjectModel = {
  // ensureProjectCropGroupTable
  // Initialize project_crop_group table and bootstrap legacy projects with default crop groups
  async getAll() {
    await ensureProjectCropGroupTable();

    const query = `
      SELECT
        p.*, 
        COALESCE(
          ARRAY_AGG(pcg.crop_group ORDER BY pcg.crop_group)
            FILTER (WHERE pcg.crop_group IS NOT NULL),
          ARRAY[]::crop_group[]
        )::text[] AS crop_groups
      FROM project p
      LEFT JOIN project_crop_group pcg ON p.project_id = pcg.project_id
      GROUP BY p.project_id
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // getById
  // Retrieve single project with aggregated crop group assignments
  async getById(projectId) {
    await ensureProjectCropGroupTable();

    const query = `
      SELECT
        p.*, 
        COALESCE(
          ARRAY_AGG(pcg.crop_group ORDER BY pcg.crop_group)
            FILTER (WHERE pcg.crop_group IS NOT NULL),
          ARRAY[]::crop_group[]
        )::text[] AS crop_groups
      FROM project p
      LEFT JOIN project_crop_group pcg ON p.project_id = pcg.project_id
      WHERE p.project_id = $1
      GROUP BY p.project_id
    `;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  },

  // create
  // Insert new project with transactional crop group assignment
  async create(
    projectName,
    description,
    startDate,
    endDate,
    projectCode,
    createdBy,
    cropGroups = ["legumes"],
  ) {
    await ensureProjectCropGroupTable();

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO project (project_id, project_name, project_code, description, start_date, end_date, created_by, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;
      const result = await client.query(query, [
        projectName,
        projectCode || null,
        description,
        startDate,
        endDate,
        createdBy,
      ]);

      const createdProject = result.rows[0];
      await assignProjectCropGroups(
        client,
        createdProject.project_id,
        cropGroups,
      );

      await client.query("COMMIT");
      return this.getById(createdProject.project_id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // update
  // Update project fields and conditionally update crop group assignments
  async update(
    projectId,
    projectName,
    description,
    startDate,
    endDate,
    projectCode,
    cropGroups,
  ) {
    await ensureProjectCropGroupTable();

    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      const query = `
        UPDATE project 
        SET project_name = $1, project_code = $2, description = $3, start_date = $4, end_date = $5
        WHERE project_id = $6
        RETURNING *
      `;
      const result = await client.query(query, [
        projectName,
        projectCode || null,
        description,
        startDate,
        endDate,
        projectId,
      ]);

      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }

      if (Array.isArray(cropGroups)) {
        await assignProjectCropGroups(client, projectId, cropGroups);
      }

      await client.query("COMMIT");
      return this.getById(projectId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // delete
  // Remove project and cascade delete associated crop groups
  async delete(projectId) {
    const query = `DELETE FROM project WHERE project_id = $1 RETURNING project_id`;
    const result = await db.query(query, [projectId]);
    return result.rows[0];
  },
};

module.exports = ProjectModel;
