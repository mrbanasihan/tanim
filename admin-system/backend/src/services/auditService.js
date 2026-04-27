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

const isSoftDeletePayload = (actionType, payload) => {
  if (actionType !== "UPDATE" || !payload || typeof payload !== "object") {
    return false;
  }

  const changes = payload.changes || payload.updated_fields || {};
  return (
    payload.operation === "soft_delete" ||
    payload.change_type === "soft_delete" ||
    payload.deleted === true ||
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
  const normalizedOffset = Number.isFinite(Number(offset))
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
      conditions.push(
        `(action_type = 'UPDATE' AND (payload->>'operation' = 'soft_delete' OR payload->>'change_type' = 'soft_delete' OR payload->'changes'->>'is_active' = 'false'))`,
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

const listUsers = async () => {
  if (await hasTable('public."user"')) {
    const result = await db.query(
      `
        SELECT user_id, email, first_name, last_name, role, is_active, created_at
        FROM "user"
        ORDER BY created_at DESC
      `,
    );

    return result.rows;
  }

  if (await hasTable("public.users")) {
    const result = await db.query(
      `
        SELECT
          user_id,
          email,
          COALESCE(first_name, split_part(email, '@', 1)) AS first_name,
          COALESCE(last_name, '') AS last_name,
          COALESCE(role, 'guest') AS role,
          COALESCE(is_active, true) AS is_active,
          created_at
        FROM users
        ORDER BY created_at DESC
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

  await recordAuditLog({
    actionType: "CREATE",
    actor,
    payload: { entity: "user", user_id: result.rows[0].user_id, email },
  });

  return result.rows[0];
};

const updateUser = async (userId, data, actor = "admin-system") => {
  const { actor: ignoredActor, ...updateData } = data || {};
  const nextData = { ...updateData };
  if (nextData.password) {
    nextData.password = await bcrypt.hash(nextData.password, 10);
  }

  const { clause, values } = buildUpdateClause(nextData, 2);
  if (!clause) {
    throw new Error("No fields provided for update");
  }

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

  await recordAuditLog({
    actionType: "UPDATE",
    actor,
    payload: { entity: "user", user_id: userId, changes: updateData },
  });

  return result.rows[0];
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

  const result = await db.query(
    `
      SELECT project_id, project_name, project_code, description, start_date, end_date, created_by, created_at
      FROM project
      ORDER BY created_at DESC
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

  await recordAuditLog({
    actionType: "CREATE",
    actor,
    payload: {
      entity: "project",
      project_id: result.rows[0].project_id,
      project_name: data.project_name,
    },
  });

  return result.rows[0];
};

const updateProject = async (projectId, data, actor = "admin-system") => {
  const { actor: ignoredActor, ...updateData } = data || {};
  const { clause, values } = buildUpdateClause(updateData, 2);
  if (!clause) {
    throw new Error("No fields provided for update");
  }

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

  await recordAuditLog({
    actionType: "UPDATE",
    actor,
    payload: { entity: "project", project_id: projectId, changes: updateData },
  });

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
  listAuditLogs,
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
