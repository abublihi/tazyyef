module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  moduleNameMapper: {
    "^ioredis$": "<rootDir>/__mocks__/ioredis.js",
  },
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/app.js",
    "!src/config/**",
    "!src/routes/**",
    "!src/middleware/**",
    "!src/controllers/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  clearMocks: true,
  restoreMocks: true,
};
