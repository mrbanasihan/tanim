const RoomModel = require("../models/roomModel");

const getAll = async (req, res) => {
  try {
    const rooms = await RoomModel.getAll();
    res.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
};

const getById = async (req, res) => {
  try {
    const room = await RoomModel.getById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ error: "Failed to fetch room" });
  }
};

const create = async (req, res) => {
  try {
    const room = await RoomModel.create(req.body);
    res.status(201).json(room);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
};

const update = async (req, res) => {
  try {
    const room = await RoomModel.update(req.params.id, req.body);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ error: "Failed to update room" });
  }
};

const remove = async (req, res) => {
  try {
    const room = await RoomModel.delete(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({ message: "Room deleted" });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ error: "Failed to delete room" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
