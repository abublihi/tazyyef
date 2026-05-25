// Centralized async error handler for Express controllers.
// Eliminates repetitive try/catch blocks by forwarding errors to Express error middleware.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
