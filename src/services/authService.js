const bcrypt = require("bcryptjs");
const env = require("../config/env");

// Hash the admin password once at startup for session verification
const hashedPassword = bcrypt.hashSync(env.adminPass, 10);

class AuthService {
  // Validate credentials against env-stored admin user
  static validateCredentials(username, password) {
    if (username !== env.adminUser) return false;
    if (typeof password !== "string") return false;
    return bcrypt.compareSync(password, hashedPassword);
  }

  // Verify a password against the stored hash
  static verifyPassword(password) {
    if (typeof password !== "string") return false;
    return bcrypt.compareSync(password, hashedPassword);
  }
}

module.exports = AuthService;
