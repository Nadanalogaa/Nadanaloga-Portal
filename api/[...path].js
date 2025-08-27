// api/[...path].js
// Forwards any /api/* request to the Express app
const handler = require('./server.cjs');

// Handle all HTTP methods by forwarding to Express
module.exports = handler;
