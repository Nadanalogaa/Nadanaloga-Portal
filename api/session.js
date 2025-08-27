// api/session.js
const handler = require('./server.cjs');

module.exports = async (req, res) => {
  return handler(req, res);
};