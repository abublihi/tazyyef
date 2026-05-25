const bcrypt = require("bcryptjs");
const env = require("../config/env");

// Hash the admin password once at startup for session verification
const hashedPassword = bcrypt.hashSync(env.adminPass, 10);

class AuthService {
  static #isValidPassword(password) {
    return typeof password === "string" && bcrypt.compareSync(password, hashedPassword);
  }

  // Validate credentials against env-stored admin user
  static validateCredentials(username, password) {
    return username === env.adminUser && this.#isValidPassword(password);
  }

  // Verify a password against the stored hash
  static verifyPassword(password) {
    return this.#isValidPassword(password);
  }
}

module.exports = AuthService;
