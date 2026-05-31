const db = require("../services/db");
const { CROP_GROUPS } = require("../constants/cropCatalog");

const UserModel = {
  // create
  // Insert new user with email, hashed password, name, and role assignment
  async create(email, passwordHash, firstName, lastName, role = "guest") {
    const query = `
            INSERT INTO "user" (user_id, email, password, first_name, last_name, role, is_active, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW())
            RETURNING user_id, email, first_name, last_name, role
        `;
    const result = await db.query(query, [
      email,
      passwordHash,
      firstName,
      lastName,
      role,
    ]);
    return result.rows[0];
  },

  // findByEmail
  // Retrieve active user by email address
  async findByEmail(email) {
    const query = `SELECT * FROM "user" WHERE email = $1 AND is_active = true`;
    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  // findById
  // Fetch user details with assigned crop groups (admin gets all groups)
  async findById(userId) {
    const query = `SELECT user_id, email, first_name, last_name, role, created_at 
    FROM "user" WHERE user_id = $1 AND is_active = true`;
    const result = await db.query(query, [userId]);
    const user = result.rows[0];

    if (!user) return null;

    // Get crop groups for non-admin users
    if (user.role !== "admin") {
      const cropQuery = `SELECT crop_group FROM user_crop_group WHERE user_id = $1 ORDER BY crop_group ASC`;
      const cropResult = await db.query(cropQuery, [userId]);
      user.crop_groups = cropResult.rows.map((r) => r.crop_group);
    } else {
      user.crop_groups = [...CROP_GROUPS];
    }

    return user;
  },

  // createSession
  // Create authentication session record with token and expiration time
  async createSession(userId, token, expiresAt) {
    const query = `
        INSERT INTO user_session (session_id, user_id, token, expires_at, created_at) 
        VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
        RETURNING session_id
        `;
    const result = await db.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  },

  // deleteSession
  // Invalidate session by removing token from database
  async deleteSession(token) {
    const query = `DELETE FROM user_session WHERE token = $1`;
    await db.query(query, [token]);
  },

  // findSessionbyToken
  // Retrieve valid session by token (checks expiration time)
  async findSessionbyToken(token) {
    const query = `SELECT * FROM user_session WHERE token = $1 AND expires_at > NOW()`;
    const result = await db.query(query, [token]);
    return result.rows[0];
  },
};

module.exports = UserModel;
