
var ostracodMultiplayer = require("ostracod-multiplayer");

console.log("Starting OstracodMultiplayer...");

var tempResult = ostracodMultiplayer.initializeServer(__dirname);

if (!tempResult) {
    process.exit(1);
}


