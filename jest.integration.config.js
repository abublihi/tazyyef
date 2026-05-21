module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.js"],
  collectCoverageFrom: ["src/**/*.js"],
  coverageDirectory: "coverage/integration",
  clearMocks: true,
  restoreMocks: true,
};
