const AuthService = require("../services/authService");

class AuthController {
  // POST /api/admin/auth/login
  static login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (!AuthService.validateCredentials(username, password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Store authenticated flag in session
    req.session.authenticated = true;
    req.session.username = username;
    res.json({ message: "Login successful" });
  }

  // POST /api/admin/auth/logout
  static logout(req, res) {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Failed to logout" });
      res.json({ message: "Logged out" });
    });
  }

  // GET /api/admin/auth/me
  static me(req, res) {
    if (req.session.authenticated) {
      return res.json({ authenticated: true, username: req.session.username });
    }
    res.json({ authenticated: false });
  }
}

module.exports = AuthController;
