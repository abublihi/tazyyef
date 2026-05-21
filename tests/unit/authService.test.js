const AuthService = require("../../src/services/authService");
const env = require("../../src/config/env");

jest.mock("../../src/config/env", () => ({
  adminUser: "admin",
  adminPass: "testpassword123",
}));

describe("AuthService", () => {
  describe("validateCredentials", () => {
    it("returns true for correct username and password", () => {
      const result = AuthService.validateCredentials("admin", "testpassword123");
      expect(result).toBe(true);
    });

    it("returns false for incorrect username", () => {
      const result = AuthService.validateCredentials("wronguser", "testpassword123");
      expect(result).toBe(false);
    });

    it("returns false for incorrect password", () => {
      const result = AuthService.validateCredentials("admin", "wrongpassword");
      expect(result).toBe(false);
    });

    it("returns false when both username and password are incorrect", () => {
      const result = AuthService.validateCredentials("wronguser", "wrongpassword");
      expect(result).toBe(false);
    });

    it("returns false for empty username", () => {
      const result = AuthService.validateCredentials("", "testpassword123");
      expect(result).toBe(false);
    });

    it("returns false for empty password", () => {
      const result = AuthService.validateCredentials("admin", "");
      expect(result).toBe(false);
    });

    it("returns false for null username", () => {
      const result = AuthService.validateCredentials(null, "testpassword123");
      expect(result).toBe(false);
    });

    it("returns false for null password", () => {
      const result = AuthService.validateCredentials("admin", null);
      expect(result).toBe(false);
    });

    it("returns false for undefined values", () => {
      expect(AuthService.validateCredentials(undefined, undefined)).toBe(false);
    });

    it("is case-sensitive for username", () => {
      const result = AuthService.validateCredentials("Admin", "testpassword123");
      expect(result).toBe(false);
    });
  });

  describe("verifyPassword", () => {
    it("returns true for correct password", () => {
      const result = AuthService.verifyPassword("testpassword123");
      expect(result).toBe(true);
    });

    it("returns false for incorrect password", () => {
      const result = AuthService.verifyPassword("wrongpassword");
      expect(result).toBe(false);
    });

    it("returns false for empty password", () => {
      const result = AuthService.verifyPassword("");
      expect(result).toBe(false);
    });

    it("returns false for null password", () => {
      const result = AuthService.verifyPassword(null);
      expect(result).toBe(false);
    });

    it("returns false for undefined password", () => {
      const result = AuthService.verifyPassword(undefined);
      expect(result).toBe(false);
    });
  });

  describe("hash behavior", () => {
    it("validates the same password consistently", () => {
      const result1 = AuthService.validateCredentials("admin", "testpassword123");
      const result2 = AuthService.validateCredentials("admin", "testpassword123");
      expect(result1).toBe(result2);
    });

    it("does not validate a similar but different password", () => {
      const result = AuthService.validateCredentials("admin", "testpassword124");
      expect(result).toBe(false);
    });
  });
});
