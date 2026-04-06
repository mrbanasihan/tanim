const db = require("../services/db");

const UserModel = {
  // Creates new user in the database
  async create(email, passwordHash, firstName, lastName, role = "guest") {
    const query = `
            INSERT INTO users (user_id, email, password_hash, first_name, last_name, role, is_active, created_at)
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

  async findByEmail(email) {
    const query = `SELECT * FROM users WHERE email = $1 AND is_active = true`;
    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  async findById(userId) {
    const query = `SELECT user_id, emil, first_name, last_name, role, created_at 
    FROM users WHERE user_id = $1 AND is_active = true`;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  async createSession(userId, token, expiresAt) {
    const query = `
        INSERT INTO user_sessions (session_id, user_id, token, expires_at, created_at) 
        VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
        RETURNING session_id
        `;
    const result = await db.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  },

  async deleteSession(token) {
    const query = `DELETE FROM user_sessions WHERE token = $1`;
    await db.query(query, [token]);
  },

  async findSessionbyToken(token) {
    const query = `SELECT * FROM user_sessions WHERE token = $1 AND expires_at > NOW()`;
    const result = await db.query(query, [token]);
    return result.rows[0];
  },
};

module.exports = UserModel;
