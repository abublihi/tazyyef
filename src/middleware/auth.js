// Require admin session authentication for protected routes
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

module.exports = requireAuth;
