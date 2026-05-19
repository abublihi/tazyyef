// Validate that a JSON string field is valid JSON
function validateJsonField(fieldName) {
  return (req, res, next) => {
    const value = req.body[fieldName];
    if (value === undefined || value === null) return next();

    // Accept both string and object forms
    if (typeof value === "object") return next();

    if (typeof value === "string") {
      try {
        JSON.parse(value);
        return next();
      } catch {
        return res.status(400).json({ error: `${fieldName} must be valid JSON` });
      }
    }

    res.status(400).json({ error: `${fieldName} must be a JSON object or JSON string` });
  };
}

module.exports = { validateJsonField };
