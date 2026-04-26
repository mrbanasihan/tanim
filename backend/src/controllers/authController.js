const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "6h"; // Token expiration in 6 hours

const AuthController = {
  // POST /api/auth/register
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create(
        email,
        passwordHash,
        firstName,
        lastName,
        role || "guest",
      );

      res.status(201).son({
        message: "User registered successfully",
        user: user,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      // Find user by email in the database
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6); // Set expiration time to 6 hours

      // Create session in the database
      await UserModel.createSession(user.user_id, token, expiresAt);

      const hydratedUser = await UserModel.findById(user.user_id);

      res.json({
        message: "Login successful",
        token: token,
        user: {
          userId: hydratedUser.user_id,
          email: hydratedUser.email,
          firstName: hydratedUser.first_name,
          lastName: hydratedUser.last_name,
          role: hydratedUser.role,
          crop_groups: hydratedUser.crop_groups,
          current_crop_group: hydratedUser.crop_groups?.[0] || "legumes",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        await UserModel.deleteSession(token);
      }
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/auth/me
  async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = AuthController;
