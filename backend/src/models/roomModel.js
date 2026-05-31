const db = require("../services/db");

const RoomModel = {
  // getAll
  // Retrieve all rooms from database (supports both room and rooms table schemas)
  async getAll() {
    const roomTableCheck = await db.query(
      `SELECT to_regclass('public.room') AS table_name`,
    );
    const roomsTableCheck = await db.query(
      `SELECT to_regclass('public.rooms') AS table_name`,
    );

    if (roomTableCheck.rows[0]?.table_name) {
      const query = `
        SELECT room_id, room_name, building_location, optimal_temp,
               temp_start, temp_end
        FROM room
        ORDER BY room_name
      `;
      const result = await db.query(query);
      if (result.rows.length > 0) {
        return result.rows;
      }
    }

    if (roomsTableCheck.rows[0]?.table_name) {
      const query = `
        SELECT room_id, name AS room_name, description AS building_location,
               NULL AS optimal_temp, temperature_min AS temp_start,
               temperature_max AS temp_end
        FROM rooms
        ORDER BY name
      `;
      const result = await db.query(query);
      return result.rows;
    }

    return [];
  },

  // getById
  // Fetch single room by ID
  async getById(roomId) {
    const query = `
      SELECT room_id, room_name, building_location, optimal_temp,
             temp_start, temp_end
      FROM room
      WHERE room_id = $1
    `;
    const result = await db.query(query, [roomId]);
    if (result.rows[0]) {
      return result.rows[0];
    }

    const legacyQuery = `
      SELECT room_id, name AS room_name, description AS building_location,
             NULL AS optimal_temp, temperature_min AS temp_start,
             temperature_max AS temp_end
      FROM rooms
      WHERE room_id = $1
    `;
    const legacyResult = await db.query(legacyQuery, [roomId]);
    return legacyResult.rows[0];
  },

  // Create new room
  async create(roomData) {
    const query = `
      INSERT INTO room (room_id, room_name, building_location, optimal_temp, temp_start, temp_end, recorded_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await db.query(query, [
      roomData.room_name,
      roomData.building_location,
      roomData.optimal_temp,
      roomData.temp_start,
      roomData.temp_end,
    ]);
    return result.rows[0];
  },

  // Update room
  async update(roomId, roomData) {
    const query = `
      UPDATE room 
      SET room_name = $1, building_location = $2, optimal_temp = $3, temp_start = $4, temp_end = $5
      WHERE room_id = $6
      RETURNING *
    `;
    const result = await db.query(query, [
      roomData.room_name,
      roomData.building_location,
      roomData.optimal_temp,
      roomData.temp_start,
      roomData.temp_end,
      roomId,
    ]);
    return result.rows[0];
  },

  // Delete room
  async delete(roomId) {
    const query = `DELETE FROM room WHERE room_id = $1 RETURNING room_id`;
    const result = await db.query(query, [roomId]);
    return result.rows[0];
  },
};

module.exports = RoomModel;
