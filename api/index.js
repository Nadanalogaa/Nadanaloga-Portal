// Copy the full server implementation from server/server.js
const fs = require('fs');
const path = require('path');

// Get the server implementation from the main server file
const serverPath = path.join(__dirname, '../server/server.js');
const serverCode = fs.readFileSync(serverPath, 'utf8');

// Execute the server code and export the result
eval(serverCode);