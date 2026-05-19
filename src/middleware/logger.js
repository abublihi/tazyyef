const morgan = require("morgan");

// Morgan logger with custom token for response body size
const logger = morgan(":method :url :status :res[content-length] - :response-time ms");

module.exports = logger;
