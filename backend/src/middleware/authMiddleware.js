const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not defined in .env file");
  process.exit(1);
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Does session exist in the database and is valid
    const session = await UserModel.findSessionbyToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    console.error("Authentication error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { authenticate };
