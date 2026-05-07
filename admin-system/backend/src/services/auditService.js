const bcrypt = require("bcrypt");
const db = require("./db");

const buildUpdateClause = (fields, startIndex = 1) => {
  const entries = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  const values = [];
  const parts = [];

  entries.forEach(([key, value], index) => {
    parts.push(`"${key}" = $${startIndex + index}`);
    values.push(value);
  });

  return {
    clause: parts.join(", "),
    values,
  };
};

const splitDisplayName = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[\-_]+/g, " ");
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "Unknown", lastName: "Actor" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const toBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  return false;
};

const normalizeGroups = (groups) => {
  const input = Array.isArray(groups) ? groups : [groups];
  return [...new Set(input.filter(Boolean))];
};

const assignProjectCropGroups = async (projectId, groups) => {
  if (!Array.isArray(groups) && !groups) {
    return;
  }

  const normalizedGroups = normalizeGroups(groups);

  await db.query(`DELETE FROM project_crop_group WHERE project_id = $1`, [
    projectId,
  ]);

  if (normalizedGroups.length === 0) {
    return;
  }

  await db.query(
    `
      INSERT INTO project_crop_group (project_id, crop_group)
      SELECT $1::uuid, UNNEST($2::text[])
      ON CONFLICT (project_id, crop_group) DO NOTHING
    `,
    [projectId, normalizedGroups],
  );
};

const assignUserCropGroups = async (userId, groups) => {
  if (!Array.isArray(groups) && !groups) {
    return;
  }

  const normalizedGroups = normalizeGroups(groups);

  await db.query(`DELETE FROM user_crop_group WHERE user_id = $1`, [userId]);

  if (normalizedGroups.length === 0) {
    return;
  }

  await db.query(
    `
      INSERT INTO user_crop_group (user_id, crop_group)
      SELECT $1::uuid, UNNEST($2::text[])
      ON CONFLICT (user_id, crop_group) DO NOTHING
    `,
    [userId, normalizedGroups],
  );
};

const isSoftDeletePayload = (actionType, payload) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  // Explicit soft-delete markers
  if (
    payload.operation === "soft_delete" ||
    payload.change_type === "soft_delete" ||
    payload.deleted === true
  ) {
    return true;
  }

  // Only UPDATE actions can be implicit soft-deletes (deactivations)
  if (actionType !== "UPDATE") {
    return false;
  }

  // For UPDATEs: only if ONLY is_active is being changed and it's being set to false
  const changes = payload.changes || payload.updated_fields || {};
  const changedKeys = Object.keys(changes);

  // Must change only is_active and it must be set to false
  return (
    changedKeys.length === 1 &&
    changedKeys[0] === "is_active" &&
    toBoolean(changes.is_active) === false
  );
};

const formatAuditRow = (row) => {
  const actorDisplayName =
    row.actor_display_name || row.actor || "Unknown actor";
  const fallbackName = splitDisplayName(actorDisplayName);
  const softDelete = isSoftDeletePayload(row.action_type, row.payload);

  return {
    ...row,
    actor_display_name: actorDisplayName,
    actor_first_name: row.actor_first_name || fallbackName.firstName,
    actor_last_name: row.actor_last_name || fallbackName.lastName,
    action_display_type: softDelete ? "SOFT DELETE" : row.action_type,
    is_soft_delete: softDelete,
  };
};

const recordAuditLog = async ({
  actionType,
  actor,
  payload,
  sourceEventId = null,
}) => {
  await db.query(
    `
      INSERT INTO audit_log (action_type, actor, payload, source_event_id)
      VALUES ($1, $2, $3, $4)
    `,
    [actionType, actor, payload, sourceEventId],
  );
};

let temperatureLogTableReadyPromise;

const ensureTemperatureLogTable = async () => {
  if (!temperatureLogTableReadyPromise) {
    temperatureLogTableReadyPromise = db
      .query(
        `
      CREATE TABLE IF NOT EXISTS temperature_log (
        temp_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sensor_id UUID,
        room_id UUID,
        payload JSONB NOT NULL,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
      )
      .then(() =>
        db.query(
          `CREATE INDEX IF NOT EXISTS idx_temperature_log_logged_at ON temperature_log(logged_at DESC)`,
        ),
      )
      .then(() =>
        db.query(
          `CREATE INDEX IF NOT EXISTS idx_temperature_log_sensor_room ON temperature_log(sensor_id, room_id)`,
        ),
      )
      .catch((error) => {
        temperatureLogTableReadyPromise = null;
        throw error;
      });
  }

  return temperatureLogTableReadyPromise;
};

const recordTemperatureLog = async ({
  sensorId = null,
  roomId = null,
  payload,
}) => {
  await ensureTemperatureLogTable();

  await db.query(
    `
      INSERT INTO temperature_log (sensor_id, room_id, payload)
      VALUES ($1, $2, $3)
    `,
    [sensorId, roomId, payload],
  );
};

const recordAuditLogOnce = async ({
  actionType,
  actor,
  payload,
  sourceEventId = null,
}) => {
  const result = await db.query(
    `
      INSERT INTO audit_log (action_type, actor, payload, source_event_id)
      SELECT $1, $2, $3, $4
      WHERE NOT EXISTS (
        SELECT 1
        FROM audit_log
        WHERE source_event_id = $4
      )
    `,
    [actionType, actor, payload, sourceEventId],
  );

  return result.rowCount > 0;
};

const hasTable = async (tableName) => {
  const result = await db.query(`SELECT to_regclass($1) AS table_name`, [
    tableName,
  ]);
  return Boolean(result.rows[0]?.table_name);
};

const listAuditLogs = async ({
  search = "",
  actionType = "",
  actor = "",
  limit = 10,
  offset = 0,
  page,
  pageSize,
}) => {
  const conditions = [];
  const values = [];

  const normalizedPageSize = Number(pageSize || limit) || 10;
  const normalizedPage = Number(page) || 1;
  const hasOffset =
    offset !== undefined && offset !== null && String(offset).trim() !== "";
  const normalizedOffset =
    hasOffset && Number.isFinite(Number(offset))
      ? Number(offset)
      : (normalizedPage - 1) * normalizedPageSize;

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(a.actor ILIKE $${values.length} OR COALESCE(CONCAT_WS(' ', u.first_name, u.last_name), '') ILIKE $${values.length} OR action_type::text ILIKE $${values.length} OR COALESCE(payload::text, '') ILIKE $${values.length})`,
    );
  }

  if (actionType) {
    if (actionType === "SOFT_DELETE") {
      // Match explicit soft-delete markers OR implicit deactivations
      conditions.push(
        `(payload->>'operation' = 'soft_delete' OR payload->>'change_type' = 'soft_delete' OR payload->>'deleted' = 'true')`,
      );
    } else {
      values.push(actionType);
      conditions.push(`action_type = $${values.length}`);
    }
  }

  if (actor) {
    values.push(`%${actor}%`);
    conditions.push(
      `(a.actor ILIKE $${values.length} OR COALESCE(CONCAT_WS(' ', u.first_name, u.last_name), '') ILIKE $${values.length})`,
    );
  }

  conditions.push(`a.action_type <> 'TEMPERATURE'`);

  values.push(normalizedPageSize);
  const limitParam = values.length;
  values.push(normalizedOffset);
  const offsetParam = values.length;

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const baseFromClause = `
      FROM audit_log a
      LEFT JOIN "user" u ON u.user_id::text = a.actor
    `;

  const totalResult = await db.query(
    `
      SELECT COUNT(*)::int AS total
      ${baseFromClause}
      ${whereClause}
    `,
    values.slice(0, values.length - 2),
  );

  const result = await db.query(
    `
      SELECT
        a.audit_id,
        a.action_type,
        a.actor,
        COALESCE(NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), a.actor) AS actor_display_name,
        u.first_name AS actor_first_name,
        u.last_name AS actor_last_name,
        a.payload,
        a.source_event_id,
        a.logged_at
      ${baseFromClause}
      ${whereClause}
      ORDER BY a.logged_at DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `,
    values,
  );

  const rows = result.rows.map(formatAuditRow);
  const total = Number(totalResult.rows[0]?.total || 0);

  return {
    rows,
    total,
    page: Math.floor(normalizedOffset / normalizedPageSize) + 1,
    pageSize: normalizedPageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / normalizedPageSize),
  };
};

const listTemperatureLogs = async ({
  search = "",
  limit = 10,
  offset,
  page,
  pageSize,
}) => {
  await ensureTemperatureLogTable();

  const conditions = [];
  const values = [];

  const normalizedPageSize = Number(pageSize || limit) || 10;
  const normalizedPage = Number(page) || 1;
  const hasOffset =
    offset !== undefined && offset !== null && String(offset).trim() !== "";
  const normalizedOffset =
    hasOffset && Number.isFinite(Number(offset))
      ? Number(offset)
      : (normalizedPage - 1) * normalizedPageSize;

  if (search) {
    values.push(`%${search}%`);
    const param = values.length;
    conditions.push(
      `(COALESCE(sensor_id::text, '') ILIKE $${param} OR COALESCE(room_id::text, '') ILIKE $${param} OR COALESCE(payload::text, '') ILIKE $${param})`,
    );
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM temperature_log
      ${whereClause}
    `,
    values,
  );

  values.push(normalizedPageSize);
  const limitParam = values.length;
  values.push(normalizedOffset);
  const offsetParam = values.length;

  const result = await db.query(
    `
      SELECT
        temp_log_id AS audit_id,
        payload,
        logged_at
      FROM temperature_log
      ${whereClause}
      ORDER BY logged_at DESC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `,
    values,
  );

  const total = Number(countResult.rows[0]?.total || 0);

  return {
    rows: result.rows,
    total,
    page: Math.floor(normalizedOffset / normalizedPageSize) + 1,
    pageSize: normalizedPageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / normalizedPageSize),
  };
};

const listUsers = async () => {
  // Ensure user_crop_group table exists
  await db
    .query(
      `
    CREATE TABLE IF NOT EXISTS user_crop_group (
      user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
      crop_group VARCHAR(100) NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, crop_group)
    )
  `,
    )
    .catch(() => {});

  if (await hasTable('public."user"')) {
    const result = await db.query(
      `
        SELECT
          u.user_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
          COALESCE(ARRAY_AGG(ucg.crop_group::TEXT ORDER BY ucg.crop_group) FILTER (WHERE ucg.crop_group IS NOT NULL), ARRAY[]::TEXT[]) AS crop_groups
        FROM "user" u
        LEFT JOIN user_crop_group ucg ON u.user_id = ucg.user_id
        GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at
        ORDER BY u.created_at DESC
      `,
    );

    return result.rows;
  }

  if (await hasTable("public.users")) {
    const result = await db.query(
      `
        SELECT
          u.user_id,
          u.email,
          COALESCE(u.first_name, split_part(u.email, '@', 1)) AS first_name,
          COALESCE(u.last_name, '') AS last_name,
          COALESCE(u.role, 'guest') AS role,
          COALESCE(u.is_active, true) AS is_active,
          u.created_at,
          COALESCE(ARRAY_AGG(ucg.crop_group::TEXT ORDER BY ucg.crop_group) FILTER (WHERE ucg.crop_group IS NOT NULL), ARRAY[]::TEXT[]) AS crop_groups
        FROM users u
        LEFT JOIN user_crop_group ucg ON u.user_id = ucg.user_id
        GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at
        ORDER BY u.created_at DESC
      `,
    );

    return result.rows;
  }

  return [];
};

const createUser = async ({
  email,
  password,
  first_name,
  last_name,
  role = "guest",
  is_active = true,
  crop_groups = [],
  actor = "admin-system",
}) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.query(
    `
      INSERT INTO "user" (email, password, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, email, first_name, last_name, role, is_active, created_at
    `,
    [email, passwordHash, first_name, last_name, role, is_active],
  );

  const userId = result.rows[0].user_id;

  // Assign crop groups if provided and user is not admin
  if (
    role !== "admin" &&
    Array.isArray(crop_groups) &&
    crop_groups.length > 0
  ) {
    await assignUserCropGroups(userId, crop_groups);
  }

  await recordAuditLog({
    actionType: "CREATE",
    actor,
    payload: {
      entity: "user",
      user_id: userId,
      email,
      role,
      crop_groups: crop_groups || [],
    },
  });

  // Return user with crop_groups
  const userWithGroups = await db.query(
    `
      SELECT
        u.user_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
        COALESCE(ARRAY_AGG(ucg.crop_group::TEXT ORDER BY ucg.crop_group) FILTER (WHERE ucg.crop_group IS NOT NULL), ARRAY[]::TEXT[]) AS crop_groups
      FROM "user" u
      LEFT JOIN user_crop_group ucg ON u.user_id = ucg.user_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at
    `,
    [userId],
  );

  return userWithGroups.rows[0];
};

const updateUser = async (userId, data, actor = "admin-system") => {
  const { actor: ignoredActor, crop_groups, ...updateData } = data || {};
  const nextData = { ...updateData };
  if (nextData.password) {
    nextData.password = await bcrypt.hash(nextData.password, 10);
  }

  const { clause, values } = buildUpdateClause(nextData, 2);

  let updatedUser = null;
  if (clause) {
    const result = await db.query(
      `
        UPDATE "user"
        SET ${clause}
        WHERE user_id = $1
        RETURNING user_id, email, first_name, last_name, role, is_active, created_at
      `,
      [userId, ...values],
    );

    if (result.rowCount === 0) {
      throw new Error("User not found");
    }

    updatedUser = result.rows[0];
  } else {
    // Verify user exists even if no fields to update
    const checkResult = await db.query(
      `SELECT user_id, role FROM "user" WHERE user_id = $1`,
      [userId],
    );
    if (checkResult.rowCount === 0) {
      throw new Error("User not found");
    }
    updatedUser = checkResult.rows[0];
  }

  // Handle crop groups if provided and user is not admin
  if (Array.isArray(crop_groups)) {
    if (updatedUser.role !== "admin") {
      await assignUserCropGroups(userId, crop_groups);
    }
  }

  const auditPayload = { entity: "user", user_id: userId };
  if (clause) {
    auditPayload.changes = updateData;
  }
  if (Array.isArray(crop_groups)) {
    auditPayload.crop_groups = crop_groups;
  }

  await recordAuditLog({
    actionType: "UPDATE",
    actor,
    payload: auditPayload,
  });

  // Return user with crop_groups
  const userWithGroups = await db.query(
    `
      SELECT
        u.user_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
        COALESCE(ARRAY_AGG(ucg.crop_group::TEXT ORDER BY ucg.crop_group) FILTER (WHERE ucg.crop_group IS NOT NULL), ARRAY[]::TEXT[]) AS crop_groups
      FROM "user" u
      LEFT JOIN user_crop_group ucg ON u.user_id = ucg.user_id
      WHERE u.user_id = $1
      GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at
    `,
    [userId],
  );

  return userWithGroups.rows[0];
};

const deleteUser = async (userId, actor = "admin-system") => {
  const result = await db.query(
    `
      UPDATE "user"
      SET is_active = FALSE
      WHERE user_id = $1
      RETURNING user_id, email, first_name, last_name
    `,
    [userId],
  );

  if (result.rowCount === 0) {
    throw new Error("User not found");
  }

  await recordAuditLog({
    actionType: "UPDATE",
    actor,
    payload: {
      entity: "user",
      user_id: userId,
      email: result.rows[0].email,
      operation: "soft_delete",
      changes: { is_active: false },
    },
  });

  return result.rows[0];
};

const updateUserRole = async (userId, role, actor = "admin-system") => {
  const result = await db.query(
    `
      UPDATE "user"
      SET role = $2
      WHERE user_id = $1
      RETURNING user_id, email, role
    `,
    [userId, role],
  );

  if (result.rowCount === 0) {
    throw new Error("User not found");
  }

  await recordAuditLog({
    actionType: "UPDATE",
    actor,
    payload: { entity: "user_role", user_id: userId, role },
  });

  return result.rows[0];
};

const listProjects = async () => {
  if (!(await hasTable("public.project"))) {
    return [];
  }

  // Ensure project_crop_group table exists
  await db
    .query(
      `
    CREATE TABLE IF NOT EXISTS project_crop_group (
      project_id UUID REFERENCES project(project_id) ON DELETE CASCADE,
      crop_group VARCHAR(100) NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, crop_group)
    )
  `,
    )
    .catch(() => {}); // Ignore if table already exists

  const result = await db.query(
    `
      SELECT
        p.project_id, p.project_name, p.project_code, p.description, p.start_date, p.end_date, p.created_by, p.created_at,
        COALESCE(ARRAY_AGG(pcg.crop_group::TEXT ORDER BY pcg.crop_group) FILTER (WHERE pcg.crop_group IS NOT NULL), ARRAY[]::TEXT[]) AS crop_groups
      FROM project p
      LEFT JOIN project_crop_group pcg ON p.project_id = pcg.project_id
      GROUP BY p.project_id, p.project_name, p.project_code, p.description, p.start_date, p.end_date, p.created_by, p.created_at
      ORDER BY p.created_at DESC
    `,
  );

  return result.rows;
};

const createProject = async (data, actor = "admin-system") => {
  const result = await db.query(
    `
      INSERT INTO project (project_name, project_code, description, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      data.project_name,
      data.project_code || null,
      data.description || null,
      data.start_date || null,
      data.end_date || null,
      data.created_by || null,
    ],
  );

  const projectId = result.rows[0].project_id;

  // Assign crop groups if provided
  if (data.crop_groups && data.crop_groups.length > 0) {
    await assignProjectCropGroups(projectId, data.crop_groups);
  }

  await recordAuditLog({
    actionType: "CREATE",
    actor,
    payload: {
      entity: "project",
      project_id: projectId,
      project_name: data.project_name,
      crop_groups: data.crop_groups || [],
    },
  });

  // Return project with crop_groups
  const updatedResult = await db.query(
    `
      SELECT
        p.project_id, p.project_name, p.project_code, p.description, p.start_date, p.end_date, p.created_by, p.created_at,
        COALESCE(ARRAY_AGG(pcg.crop_group::TEXT ORDER BY pcg.crop_group) FILTER (WHERE pcg.crop_group IS NOT NULL), ARRAY[]::TEXT[]) AS crop_groups
      FROM project p
      LEFT JOIN project_crop_group pcg ON p.project_id = pcg.project_id
      WHERE p.project_id = $1
      GROUP BY p.project_id, p.project_name, p.project_code, p.description, p.start_date, p.end_date, p.created_by, p.created_at
    `,
    [projectId],
  );

  return updatedResult.rows[0];
};

const updateProject = async (projectId, data, actor = "admin-system") => {
  const { actor: ignoredActor, crop_groups, ...updateData } = data || {};
  const { clause, values } = buildUpdateClause(updateData, 2);

  // Update project fields if any provided
  if (clause) {
    const result = await db.query(
      `
        UPDATE project
        SET ${clause}
        WHERE project_id = $1
        RETURNING *
      `,
      [projectId, ...values],
    );

    if (result.rowCount === 0) {
      throw new Error("Project not found");
    }
  } else {
    // Verify project exists even if no fields to update
    const checkResult = await db.query(
      `SELECT project_id FROM project WHERE project_id = $1`,
      [projectId],
    );
    if (checkResult.rowCount === 0) {
      throw new Error("Project not found");
    }
  }

  // Handle crop groups if provided
  if (Array.isArray(crop_groups)) {
    await assignProjectCropGroups(projectId, crop_groups);
  }

  const auditPayload = { entity: "project", project_id: projectId };
  if (clause) {
    auditPayload.changes = updateData;
  }
  if (Array.isArray(crop_groups)) {
    auditPayload.crop_groups = crop_groups;
  }

  await recordAuditLog({
    actionType: "UPDATE",
    actor,
    payload: auditPayload,
  });

  // Return updated project with crop_groups
  const result = await db.query(
    `
      SELECT
        p.project_id, p.project_name, p.project_code, p.description, p.start_date, p.end_date, p.created_by, p.created_at,
        COALESCE(ARRAY_AGG(pcg.crop_group::TEXT ORDER BY pcg.crop_group) FILTER (WHERE pcg.crop_group IS NOT NULL), ARRAY[]::TEXT[]) AS crop_groups
      FROM project p
      LEFT JOIN project_crop_group pcg ON p.project_id = pcg.project_id
      WHERE p.project_id = $1
      GROUP BY p.project_id, p.project_name, p.project_code, p.description, p.start_date, p.end_date, p.created_by, p.created_at
    `,
    [projectId],
  );

  return result.rows[0];
};

const deleteProject = async (projectId, actor = "admin-system") => {
  const result = await db.query(
    `DELETE FROM project WHERE project_id = $1 RETURNING project_id, project_name`,
    [projectId],
  );

  if (result.rowCount === 0) {
    throw new Error("Project not found");
  }

  await recordAuditLog({
    actionType: "DELETE",
    actor,
    payload: {
      entity: "project",
      project_id: projectId,
      project_name: result.rows[0].project_name,
    },
  });

  return result.rows[0];
};

const listRooms = async () => {
  if (await hasTable("public.room")) {
    const result = await db.query(
      `
        SELECT room_id, room_name, building_location, optimal_temp, temp_start, temp_end, recorded_at
        FROM room
        ORDER BY recorded_at DESC
      `,
    );

    if (result.rows.length > 0) {
      return result.rows;
    }
  }

  if (await hasTable("public.rooms")) {
    const legacyResult = await db.query(
      `
        SELECT
          room_id,
          name AS room_name,
          description AS building_location,
          NULL::numeric AS optimal_temp,
          temperature_min AS temp_start,
          temperature_max AS temp_end,
          created_at AS recorded_at
        FROM rooms
        ORDER BY created_at DESC
      `,
    );

    return legacyResult.rows;
  }

  return [];
};

const createRoom = async (data, actor = "admin-system") => {
  const result = await db.query(
    `
      INSERT INTO room (room_name, building_location, optimal_temp, temp_start, temp_end)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      data.room_name,
      data.building_location || null,
      data.optimal_temp || null,
      data.temp_start || null,
      data.temp_end || null,
    ],
  );

  await recordAuditLog({
    actionType: "CREATE",
    actor,
    payload: {
      entity: "room",
      room_id: result.rows[0].room_id,
      room_name: data.room_name,
    },
  });

  return result.rows[0];
};

const updateRoom = async (roomId, data, actor = "admin-system") => {
  const { actor: ignoredActor, ...updateData } = data || {};
  const { clause, values } = buildUpdateClause(updateData, 2);
  if (!clause) {
    throw new Error("No fields provided for update");
  }

  const result = await db.query(
    `
      UPDATE room
      SET ${clause}
      WHERE room_id = $1
      RETURNING *
    `,
    [roomId, ...values],
  );

  if (result.rowCount === 0) {
    throw new Error("Room not found");
  }

  await recordAuditLog({
    actionType: "UPDATE",
    actor,
    payload: { entity: "room", room_id: roomId, changes: updateData },
  });

  return result.rows[0];
};

const deleteRoom = async (roomId, actor = "admin-system") => {
  const result = await db.query(
    `DELETE FROM room WHERE room_id = $1 RETURNING room_id, room_name`,
    [roomId],
  );

  if (result.rowCount === 0) {
    throw new Error("Room not found");
  }

  await recordAuditLog({
    actionType: "DELETE",
    actor,
    payload: {
      entity: "room",
      room_id: roomId,
      room_name: result.rows[0].room_name,
    },
  });

  return result.rows[0];
};

module.exports = {
  recordAuditLog,
  recordAuditLogOnce,
  recordTemperatureLog,
  listAuditLogs,
  listTemperatureLogs,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};
