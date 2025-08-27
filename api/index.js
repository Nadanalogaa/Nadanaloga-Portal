// This makes /api/* on your Vercel domain hit your Express app
const handler = require('./server.cjs');
module.exports = handler;
