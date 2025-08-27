// api/[...path].js
// Forwards any /api/* request to the Express app
const handler = require('./server.cjs');
module.exports = handler;
