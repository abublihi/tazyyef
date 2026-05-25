const AuthService = require("../services/authService");
const asyncHandler = require("../middleware/asyncHandler");

class AuthController {
  // POST /api/admin/auth/login
  static login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (!AuthService.validateCredentials(username, password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.authenticated = true;
    req.session.username = username;
    res.json({ message: "Login successful" });
  });

  // POST /api/admin/auth/logout
  static logout = asyncHandler(async (req, res) => {
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.json({ message: "Logged out" });
  });

  // GET /api/admin/auth/me
  static me = asyncHandler(async (req, res) => {
    if (req.session?.authenticated) {
      return res.json({ authenticated: true, username: req.session.username });
    }
    res.json({ authenticated: false });
  });
}

module.exports = AuthController;
