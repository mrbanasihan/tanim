const express = require("express");
const {
  listAuditLogs,
  listTemperatureLogs,
  listNotificationLogs,
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
} = require("../services/auditService");

// Admin API endpoints for audit logs, temperature logs, notification logs, users, projects, and rooms management
const router = express.Router();

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const logs = await listAuditLogs(req.query);
    res.json({ data: logs.rows, meta: logs });
  }),
);

router.get(
  "/temperature-logs",
  asyncHandler(async (req, res) => {
    const logs = await listTemperatureLogs(req.query);
    res.json({ data: logs.rows, meta: logs });
  }),
);

router.get(
  "/notification-logs",
  asyncHandler(async (req, res) => {
    const logs = await listNotificationLogs(req.query);
    res.json({ data: logs.rows, meta: logs });
  }),
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await listUsers();
    res.json({ data: users });
  }),
);

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body);
    res.status(201).json({ data: user });
  }),
);

router.put(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.params.userId, req.body, req.body.actor);
    res.json({ data: user });
  }),
);

router.delete(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const result = await deleteUser(req.params.userId, req.body?.actor);
    res.json({ data: result });
  }),
);

router.put(
  "/users/:userId/role",
  asyncHandler(async (req, res) => {
    const { role, actor } = req.body;
    const user = await updateUserRole(req.params.userId, role, actor);
    res.json({ data: user });
  }),
);

router.get(
  "/projects",
  asyncHandler(async (req, res) => {
    const projects = await listProjects();
    res.json({ data: projects });
  }),
);

router.post(
  "/projects",
  asyncHandler(async (req, res) => {
    const project = await createProject(req.body, req.body.actor);
    res.status(201).json({ data: project });
  }),
);

router.put(
  "/projects/:projectId",
  asyncHandler(async (req, res) => {
    const project = await updateProject(
      req.params.projectId,
      req.body,
      req.body.actor,
    );
    res.json({ data: project });
  }),
);

router.delete(
  "/projects/:projectId",
  asyncHandler(async (req, res) => {
    const result = await deleteProject(req.params.projectId, req.body?.actor);
    res.json({ data: result });
  }),
);

router.get(
  "/rooms",
  asyncHandler(async (req, res) => {
    const rooms = await listRooms();
    res.json({ data: rooms });
  }),
);

router.post(
  "/rooms",
  asyncHandler(async (req, res) => {
    const room = await createRoom(req.body, req.body.actor);
    res.status(201).json({ data: room });
  }),
);

router.put(
  "/rooms/:roomId",
  asyncHandler(async (req, res) => {
    const room = await updateRoom(req.params.roomId, req.body, req.body.actor);
    res.json({ data: room });
  }),
);

router.delete(
  "/rooms/:roomId",
  asyncHandler(async (req, res) => {
    const result = await deleteRoom(req.params.roomId, req.body?.actor);
    res.json({ data: result });
  }),
);

module.exports = router;
